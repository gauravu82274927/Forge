import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const link = request.nextUrl.searchParams.get('url') ?? '';
  try {
    const url = new URL(link);
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
        !/^[a-z0-9-]+\.devfolio\.co$/.test(url.hostname)) {
      return NextResponse.json({ error: 'Automatic previews currently support Devfolio event sites. Enter the details below for other links.' }, { status: 400 });
    }

    // Read only the public overview, including when an application URL was pasted.
    const eventUrl = url.origin + '/';
    const response = await fetch(eventUrl, {
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
    });
    if (!response.ok || !response.body || !response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('Event overview unavailable');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    try {
      while (html.length < 65536 && !/<\/head>/i.test(html)) {
        const { done, value } = await reader.read();
        if (done) break;
        html += decoder.decode(value, { stream: true });
      }
    } finally {
      await reader.cancel();
    }

    const meta = (property: string) => {
      for (const tag of html.slice(0, 65536).match(/<meta\b[^>]*>/gi) ?? []) {
        const attrs = new Map(Array.from(tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g),
          ([, name, double, single]) => [name.toLowerCase(), double ?? single]));
        if (attrs.get('property') === property) {
          return (attrs.get('content') ?? '').replace(/&(amp|quot|apos|lt|gt|#39);/g, (entity) =>
            ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'" })[entity] ?? entity).trim();
        }
      }
      return '';
    };
    const title = meta('og:title').replace(/\s*\|\s*Devfolio$/i, '').slice(0, 100);
    if (title.length < 2 || /^devfolio$/i.test(title)) throw new Error('Event title unavailable');

    return NextResponse.json({ title, summary: meta('og:description').slice(0, 500), eventUrl });
  } catch {
    return NextResponse.json({ error: 'Could not read the event overview. You can enter the details below.' }, { status: 422 });
  }
}
