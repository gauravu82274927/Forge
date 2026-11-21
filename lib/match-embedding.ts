import type { SupabaseClient } from '@supabase/supabase-js';

export type MatchKind = 'profile' | 'team';
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;

/** Called only on the server after checking ownership. The DB lease prevents duplicate work. */
export async function refreshEmbedding(admin: SupabaseClient, kind: MatchKind, id: string, apiKey: string) {
  const { data, error } = await admin.rpc('claim_match_embedding', { p_kind: kind, p_id: id });
  if (error) throw error;
  const input = (data as { input: string }[] | null)?.[0]?.input;
  if (!input) return 'cached';
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, input }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error('Embedding provider unavailable');
  const result = await response.json();
  const vector: unknown = result.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== EMBEDDING_DIMENSIONS ||
      !vector.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
      !vector.some((n) => n !== 0)) throw new Error('Invalid embedding');
  // Compare-and-set: a response for an older profile/listing must never replace newer input.
  const { data: saved, error: writeError } = await admin.from(kind === 'profile' ? 'profiles' : 'team_posts')
    .update({ embedding: JSON.stringify(vector) }).eq('id', id).eq('match_text', input).select('id');
  if (writeError) throw writeError;
  return saved?.length ? 'updated' : 'stale';
}
