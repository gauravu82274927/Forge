create table public.hackathon_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade default auth.uid(),
  event_name text not null check (char_length(trim(event_name)) between 2 and 100),
  event_url text not null check (event_url ~ '^https://[^[:space:]]+$' and char_length(event_url) <= 1500),
  team_url text check (team_url ~ '^https://[^[:space:]]+$' and char_length(team_url) <= 1500),
  application_url text check (application_url ~ '^https://[^[:space:]]+$' and char_length(application_url) <= 1500),
  status text not null check (status in ('recruiting', 'looking', 'participating')),
  details text not null default '' check (char_length(details) <= 500),
  created_at timestamptz not null default now(),
  unique (event_url, owner_id)
);

alter table public.hackathon_listings enable row level security;
revoke all on public.hackathon_listings from anon, authenticated;
grant select on public.hackathon_listings to anon, authenticated;
grant insert (event_name, event_url, team_url, application_url, status, details), delete on public.hackathon_listings to authenticated;
create policy "Read public hackathon listings" on public.hackathon_listings for select using (true);
create policy "Publish your hackathon listing" on public.hackathon_listings for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Remove your hackathon listing" on public.hackathon_listings for delete to authenticated using (owner_id = (select auth.uid()));
