import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite-pgvector';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { refreshEmbedding } from '../lib/match-embedding.ts';
const file = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('PostgreSQL migration, replay, authorization, eligibility, scoring and freshness', async () => {
  const db = new PGlite({ extensions: { vector, pg_trgm } });
  try {
    await db.exec(await file('tests/matchmaking-bootstrap.sql'));
    // PGlite has gen_random_uuid built in but does not ship the unused pgcrypto extension.
    await db.exec((await file('supabase/migrations/20261017090324_create_forge_core_schema.sql')).replace('CREATE EXTENSION IF NOT EXISTS pgcrypto;', ''));
    const migration = await file('supabase/migrations/20261121190000_ai_matchmaking.sql');
    await db.exec(migration);
    await db.exec(migration);
    // Separate top-level DO blocks to avoid a PGlite multi-command pgvector WASM issue.
    for (const block of (await file('tests/matchmaking.sql')).split(/(?<=END \$\$;)/)) await db.exec(block);
  } finally { await db.close(); }
});

function mockAdmin(input = 'Python backend', saved = [{ id: 'id' }]) {
  const calls = [];
  const query = {
    update(value) { calls.push(['update', value]); return this; },
    eq(key, value) { calls.push(['eq', key, value]); return this; },
    async select() { return { data: saved, error: null }; },
  };
  return { calls, async rpc() { return { data: input ? [{ input }] : [], error: null }; }, from() { return query; } };
}

test('Embedding cache, validation, API errors and compare-and-set', async (t) => {
  const vector = [1, ...Array(1535).fill(0)];
  const request = t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ data: [{ embedding: vector }] })));
  const cached = mockAdmin(null);
  assert.equal(await refreshEmbedding(cached, 'profile', 'id', 'test-key'), 'cached');
  assert.equal(request.mock.callCount(), 0);
  const admin = mockAdmin();
  assert.equal(await refreshEmbedding(admin, 'profile', 'id', 'test-key'), 'updated');
  assert.ok(admin.calls.some(c => c[0] === 'eq' && c[1] === 'match_text' && c[2] === 'Python backend'));
  assert.equal(await refreshEmbedding(mockAdmin('old text', []), 'team', 'id', 'test-key'), 'stale');
  request.mock.mockImplementation(async () => new Response('{}', { status: 429 }));
  await assert.rejects(refreshEmbedding(mockAdmin(), 'profile', 'id', 'test-key'), /provider unavailable/);
  request.mock.mockImplementation(async () => new Response(JSON.stringify({ data: [{ embedding: [1, 2] }] })));
  await assert.rejects(refreshEmbedding(mockAdmin(), 'profile', 'id', 'test-key'), /Invalid embedding/);
  request.mock.mockImplementation(async () => { throw new DOMException('timeout', 'TimeoutError'); });
  await assert.rejects(refreshEmbedding(mockAdmin(), 'profile', 'id', 'test-key'), /timeout/);
});
