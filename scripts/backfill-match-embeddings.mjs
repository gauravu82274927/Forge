// Node 24+: node --env-file=.env.local scripts/backfill-match-embeddings.mjs
import { createClient } from '@supabase/supabase-js';
import { refreshEmbedding } from '../lib/match-embedding.ts';
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, OPENAI_API_KEY: apiKey } = process.env;
if (!url || !key || !apiKey) throw new Error('Set Supabase URL, service role key, and OpenAI API key in the server environment.');
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
let failures = 0;
for (const [kind, table] of [['profile', 'profiles'], ['team', 'team_posts']]) {
  let cursor;
  let count = 0;
  while (true) {
    let query = admin.from(table).select('id').is('embedding', null).neq('match_text', '').order('id').limit(100);
    if (cursor) query = query.gt('id', cursor);
    const { data, error } = await query;
    if (error) throw new Error(`Cannot read ${table}: ${error.message}`);
    if (!data.length) break;
    for (const row of data) {
      try {
        const status = await refreshEmbedding(admin, kind, row.id, apiKey);
        if (status === 'updated') count++;
        else failures++;
      } catch { failures++; }
    }
    cursor = data.at(-1).id;
  }
  console.log(`${table}: ${count} embeddings updated`);
}
if (failures) {
  console.warn(`${failures} records failed, were already leased, or changed during processing. Retry after at least one minute; keyword matching remains available.`);
  process.exitCode = 1;
}
