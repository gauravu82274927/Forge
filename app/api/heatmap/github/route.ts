import { NextResponse } from 'next/server';
import { isGithubUsername, parseGithubContributions } from '@/lib/heatmap';

export const dynamic = 'force-dynamic';

const CACHE_OK = 'public, s-maxage=3600, stale-while-revalidate=86400';
const CACHE_ERR = 'public, s-maxage=60';

function fail(status: number, error: string) {
  return NextResponse.json({ ok: false, error }, { status, headers: { 'Cache-Control': CACHE_ERR } });
}

export async function GET(request: Request) {
  const user = new URL(request.url).searchParams.get('user') ?? '';
  if (!isGithubUsername(user)) return fail(400, 'bad_username');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://github.com/users/${encodeURIComponent(user)}/contributions`, {
      headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0 (compatible; ForgeProfileBot/1.0)' },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (res.status === 404) return fail(404, 'not_found');
    if (!res.ok) return fail(502, 'upstream_error');

    const data = parseGithubContributions(await res.text());
    if (!data) return fail(502, 'parse_failed');
    return NextResponse.json({ ok: true, username: user, ...data }, { headers: { 'Cache-Control': CACHE_OK } });
  } catch {
    return fail(502, 'upstream_unreachable');
  } finally {
    clearTimeout(timer);
  }
}
