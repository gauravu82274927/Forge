alter table public.hackathon_listings
  add column if not exists source text
  check (source in ('Devpost', 'Devfolio', 'Unstop', 'Other'));

grant insert (source) on public.hackathon_listings to authenticated;
