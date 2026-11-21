# AI skill-gap and teammate matching

Discover and Dashboard now show **AI Picks for You**. Listing owners see **Recommended teammates** on their team page. Cards link to the existing team application and public-profile flows and expose the score breakdown. No invitations or messages are sent automatically.

## Enable

1. Apply `supabase/migrations/20261121190000_ai_matchmaking.sql` to the existing Forge Supabase project using its SQL Editor or migration workflow. It expects the core Forge tables. It can be replayed. Supabase's `vector` and `pg_trgm` extensions must be installed in `extensions`; if they already exist in another schema, move them deliberately before applying this migration.
2. Deploy the updated application. SQL recommendations work immediately, with no provider key required.
3. For semantic matching, set **server-only** `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` on the deployment. Keep the existing public Supabase URL/anon key. Never put service credentials in `NEXT_PUBLIC_*` variables.
4. For existing records, run `node --env-file=.env.local scripts/backfill-match-embeddings.mjs` using Node 24 or newer from a trusted environment. This sends public profile bios/skills/interests/roles and listing descriptions/requirements to OpenAI and incurs embedding API usage. Names, contact details, messages, and applications are not deliberately included; avoid sensitive information in free-text bios. The script prints counts only. Re-run after one minute if records fail or are leased.
5. Verify with two student accounts and an owner: profile edits, new listings, matching panels, application eligibility, and provider-key removal. Browser sign-in uses Forge's existing Supabase bearer session.

## Ranking

Scores are ranking signals, not calibrated probabilities. The weights are 40% cosine/text similarity, 30% **remaining skill-gap coverage**, 15% experience, and 15% availability. Skill tags are trimmed, lowercased and deduplicated. Remaining skills subtract the owner and accepted members, recalculated on each read. This deliberately improves on comparing only the original requirements. Empty remaining requirements and missing experience/availability receive a neutral 50, while `any` experience and `flexible` availability accept all levels. Hour-range midpoints are compared proportionally (15+ is represented as 15).

Only open, unexpired listings with remaining capacity qualify. Existing applications (including withdrawn ones) are excluded because the current application flow does not support submitting a second application for the same listing. Owners and accepted members cannot recommend themselves into the same team. Empty profiles are excluded from teammate search. A signed-in user can request only their own team matches; only the listing owner can request teammates. The RPCs return a small allowlist of public fields and derived scores, never application rows.

## Embedding lifecycle and resilience

Model: `text-embedding-3-small`, fixed at 1,536 dimensions. Canonical input is computed by database triggers and limited to 6,000 characters. Changes invalidate old vectors immediately. Profile/listing saves request best-effort refresh; opening a panel also retries its source. An atomic database lease limits each record to one attempt per minute. Requests time out after eight seconds. Compare-and-set on canonical text prevents late responses from overwriting newer input. Client writes cannot assign vectors or alter leases. Service credentials never reach the browser.

Both sides need embeddings to use cosine similarity. Otherwise `pg_trgm` text similarity supplies the same 40% component, visibly labelled **Keyword similarity**. A provider outage does not block SQL ranking or saving a profile. A database outage still affects recommendations; the panel displays an explicit retry state.

HNSW indexes are provisioned for future candidate retrieval. The current RPCs score all eligible records exactly to preserve deterministic hybrid ordering; they do **not** claim to use HNSW for the composite sort. Benchmark before scaling. A later ANN shortlist should also include skill-only candidates to protect recall. The migration's initial text backfill and index creation may need a maintenance window on large tables.

## Validation

Use Node 24+: `npm ci`, `npm run typecheck`, `npm run test:matchmaking`, and `npm run build` with public Supabase settings available. Tests execute the migration twice in isolated PostgreSQL (PGlite with pgvector/pg_trgm), then exercise authorization, normalization, membership gaps, full/closed/expired/application exclusions, neutral and weighted scores, vector-write protection, leases, and stale responses. Provider tests use mocked embeddings, rate limits, malformed responses and timeouts. Test bootstrap SQL is only for isolated tests, never production.

## Rollback

Roll back the application commit first; matching columns and RPCs are additive and can remain dormant. Remove server embedding keys to stop provider usage. Do not drop columns while this application version is serving requests.
