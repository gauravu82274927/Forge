import { NextResponse } from 'next/server';
import { buildLeetcodeData, isLeetcodeUsername } from '@/lib/heatmap';

export const dynamic = 'force-dynamic';

const CACHE_OK = 'public, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_ERR = 'public, s-maxage=60';

const QUERY = `query userProfileCalendar($username: String!) {
  matchedUser(username: $username) {
    userCalendar { submissionCalendar }
  }
}`;

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': CACHE_ERR } });
}

export async function GET(request: Request) {
  const user = new URL(request.url).searchParams.get('user') ?? '';
  if (!isLeetcodeUsername(user)) return fail(400, 'bad_username');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch('https://leetcode.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referer: 'https://leetcode.com',
        'User-Agent': 'Mozilla/5.0 (compatible; ForgeProfileBot/1.0)',
      },
      body: JSON.stringify({ query: QUERY, variables: { username: user } }),
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return fail(502, 'upstream_error');

    const json = (await res.json()) as {
      data?: { matchedUser?: { userCalendar?: { submissionCalendar?: string } | null } | null };
    };
    if (json.data && json.data.matchedUser === null) return fail(404, 'not_found');

    const raw = json.data?.matchedUser?.userCalendar?.submissionCalendar;
    if (typeof raw !== 'string') return fail(502, 'parse_failed');

    const calendar = JSON.parse(raw) as Record<string, number>;
    return NextResponse.json(
      { ok: true, username: user, ...buildLeetcodeData(calendar) },
      { headers: { 'Cache-Control': CACHE_OK } }
    );
  } catch {
    return fail(502, 'upstream_unreachable');
  } finally {
    clearTimeout(timer);
  }
}
