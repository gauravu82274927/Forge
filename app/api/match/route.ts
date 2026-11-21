import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshEmbedding } from '@/lib/match-embedding';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers });
  const authorization = request.headers.get('authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Sign in required' }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return reply({ error: 'Database unavailable' }, 503);
  const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } } });
  try {
    const { data: { user }, error } = await client.auth.getUser(authorization.slice(7));
    if (error || !user) return reply({ error: 'Sign in required' }, 401);
    const body = await request.json().catch(() => null);
    if (!body || !['profile', 'team'].includes(body.kind) ||
        typeof body.id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) {
      return reply({ error: 'Invalid matching target' }, 400);
    }
    if (body.kind === 'profile') {
      if (body.id !== user.id) return reply({ error: 'Forbidden' }, 403);
    } else {
      const { data: team, error: teamError } = await client.from('team_posts').select('owner_id').eq('id', body.id).maybeSingle();
      if (teamError) return reply({ error: 'Database unavailable' }, 503);
      if (!team || team.owner_id !== user.id) return reply({ error: 'Forbidden' }, 403);
    }
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!serviceKey || !apiKey) return reply({ status: 'fallback' });
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const status = await refreshEmbedding(admin, body.kind, body.id, apiKey);
    return reply({ status });
  } catch {
    // Matching RPCs remain independent of this optional enrichment endpoint.
    return reply({ status: 'fallback' });
  }
}
