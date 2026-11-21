alter table public.hackathon_listings
  add column if not exists event_metadata jsonb
  check (
    jsonb_typeof(event_metadata) = 'object' and
    char_length(event_metadata::text) <= 8000
  );

grant insert (event_metadata) on public.hackathon_listings to authenticated;
