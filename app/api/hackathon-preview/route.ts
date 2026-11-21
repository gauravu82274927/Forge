import { NextRequest, NextResponse } from 'next/server';
import { eventFields, type EventField } from '@/lib/hackathon-event-fields';

const entities: Record<string, string> = {
  amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', mdash: '—', ndash: '–', '#39': "'",
};

function plain(text: unknown) {
  return typeof text === 'string' ? text
    .replace(/<\/(?:p|li|h[1-6])>|<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&([a-z]+|#39);/gi, (whole, key: string) => entities[key] ?? whole)
    .replace(/\*\*/g, '')
    .replace(/^#+\s+/gm, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim() : '';
}

function dateLabel(value: unknown, timeZone: string) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone,
  }).format(new Date(value)) + ' (' + timeZone + ')';
}

function devfolio(html: string) {
  const script = html.match(/<script\b[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i)?.[1];
  const event = script && JSON.parse(script).props?.pageProps?.hackathon;
  if (!event?.name) throw new Error('Missing event data');
  const details = plain(event.desc);
  const zone = typeof event.timezone === 'string' ? event.timezone : 'UTC';
  const team = [event.team_min, event.team_max].filter(value => Number.isInteger(value) && value > 0);
  const organizer = details.match(/^.*Organized by:\s*(.+)$/im)?.[1]
    ?? details.match(/Organized by ([^\n]+?), this\b/i)?.[1];
  return {
    title: event.name,
    summary: plain(event.tagline) || details.split('\n').find(line => line.length > 60),
    metadata: {
      event_details: details,
      event_period: [dateLabel(event.starts_at, zone), dateLabel(event.ends_at, zone)].filter(Boolean).join(' – '),
      event_organizer: organizer,
      event_location: event.is_online ? 'Online' : event.location,
      event_team_size: Array.from(new Set(team)).join('–'),
      event_registration_closes: dateLabel(event.settings?.reg_ends_at, zone),
      event_submission_deadline: details.match(/^(?:project )?submission deadline\s*:\s*(.+)$/im)?.[1],
    },
  };
}

function unstop(html: string) {
  const detailSection = html.split(/class="detail-page"[^>]*>/i)[1]?.split(/<h2\b|class="(?:pdng|prize|important)/i)[0];
  const details = plain(detailSection).slice(0, 3000);
  return {
    title: plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]),
    summary: details.split('\n').find(line => line.length > 60),
    metadata: {
      event_details: details,
      event_organizer: plain(html.match(/<h2>\s*<a\b[^>]*href="https:\/\/unstop\.com\/c\/[^"]+"[^>]*>([\s\S]*?)<\/a>/i)?.[1]),
      event_team_size: plain(html.match(/Team Size\s*<strong>([\s\S]*?)<\/strong>/i)?.[1]),
      event_registration_closes: plain(html.match(/Registration Deadline\s*<strong>([\s\S]*?)<\/strong>/i)?.[1]),
      event_submission_deadline: details.match(/^(?:project )?submission deadline\s*:\s*(.+)$/im)?.[1],
      event_period: details.match(/^(?:event dates|hackathon dates)\s*:\s*(.+)$/im)?.[1],
      event_location: details.match(/^(?:location|venue|mode)\s*:\s*(.+)$/im)?.[1],
    },
  };
}

async function readOverview(url: string) {
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(6500),
    cache: 'no-store',
  });
  if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/html')) {
    throw new Error('Event overview unavailable');
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let html = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return html + decoder.decode();
      bytes += value.byteLength;
      if (bytes > 2_000_000) throw new Error('Event overview too large');
      html += decoder.decode(value, { stream: true });
    }
  } finally {
    await reader.cancel();
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.nextUrl.searchParams.get('url') ?? '');
    const validUrl = url.protocol === 'https:' && !url.username && !url.password && !url.port;
    const isDevfolio = validUrl && /^[a-z0-9-]+\.devfolio\.co$/.test(url.hostname);
    const unstopPath = validUrl && ['unstop.com', 'www.unstop.com', 'api.unstop.com'].includes(url.hostname)
      ? url.pathname.match(/^\/(hackathons|competitions)\/([a-z0-9-]+-\d+)\/?$/i) : null;
    if (!isDevfolio && !unstopPath) {
      return NextResponse.json({ error: 'Import supports public Devfolio and Unstop event links. You can enter details for other sources below.' }, { status: 400 });
    }

    const path = unstopPath ? '/' + unstopPath[1] + '/' + unstopPath[2] : '/';
    const eventUrl = isDevfolio ? url.origin + '/' : 'https://unstop.com' + path;
    const html = await readOverview(isDevfolio ? eventUrl : 'https://api.unstop.com' + path);
    const canonical = unstopPath && html.match(/<link rel="canonical" href="(https:\/\/unstop\.com\/(?:hackathons|competitions)\/[a-z0-9-]+-\d+)"/i)?.[1];
    const result = isDevfolio ? devfolio(html) : unstop(html);
    const title = plain(result.title).slice(0, 100);
    if (title.length < 2) throw new Error('Event name unavailable');
    const values: Partial<Record<EventField, string | undefined>> = result.metadata;
    const metadata = Object.fromEntries(eventFields.map(([field, , limit]) => [field, plain(values[field]).slice(0, limit)]));
    return NextResponse.json({
      title, eventUrl: canonical || eventUrl, metadata,
      summary: plain(result.summary).slice(0, 500),
      source: isDevfolio ? 'Devfolio' : 'Unstop',
    });
  } catch {
    return NextResponse.json({ error: 'Could not read the public event overview. You can enter the details below.' }, { status: 422 });
  }
}
