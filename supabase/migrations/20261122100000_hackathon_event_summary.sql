alter table public.hackathon_listings
  add column if not exists event_summary text
  check (char_length(event_summary) <= 500);

grant insert (event_summary) on public.hackathon_listings to authenticated;
