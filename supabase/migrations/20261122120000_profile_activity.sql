begin;

create table if not exists public.profile_reviews (
  reviewer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 10 and 600),
  created_at timestamptz not null default now(),
  primary key (reviewer_id, profile_id),
  check (reviewer_id <> profile_id)
);
create index if not exists profile_reviews_profile_idx on public.profile_reviews(profile_id, created_at desc);
alter table public.profile_reviews enable row level security;
revoke all on public.profile_reviews from public, anon, authenticated;
grant select on public.profile_reviews to anon, authenticated;
grant insert (profile_id, body), update (body), delete on public.profile_reviews to authenticated;

create or replace function public.can_review_builder(target uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and auth.uid() <> target and exists (
    select 1 from public.team_posts t
    where not t.is_demo
      and (t.owner_id = auth.uid() or exists (
        select 1 from public.applications a where a.team_post_id = t.id and a.applicant_id = auth.uid() and a.status = 'accepted'
      ))
      and (t.owner_id = target or exists (
        select 1 from public.applications a where a.team_post_id = t.id and a.applicant_id = target and a.status = 'accepted'
      ))
  );
$$;
revoke all on function public.can_review_builder(uuid) from public, anon;
grant execute on function public.can_review_builder(uuid) to authenticated;

drop policy if exists "Read profile reviews" on public.profile_reviews;
create policy "Read profile reviews" on public.profile_reviews for select using (true);
drop policy if exists "Write teammate review" on public.profile_reviews;
create policy "Write teammate review" on public.profile_reviews for insert to authenticated
with check (reviewer_id = auth.uid() and public.can_review_builder(profile_id));
drop policy if exists "Edit own teammate review" on public.profile_reviews;
create policy "Edit own teammate review" on public.profile_reviews for update to authenticated
using (reviewer_id = auth.uid())
with check (reviewer_id = auth.uid() and public.can_review_builder(profile_id));
drop policy if exists "Remove own teammate review" on public.profile_reviews;
create policy "Remove own teammate review" on public.profile_reviews for delete to authenticated using (reviewer_id = auth.uid());

create or replace function public.builder_activity(target uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with friends as (
    select distinct case when f.requester_id = target then f.addressee_id else f.requester_id end as id
    from public.friendships f
    where f.status = 'accepted' and target in (f.requester_id, f.addressee_id)
  ), visibility as (
    select auth.uid() = target or exists (select 1 from friends where id = auth.uid()) as can_view
  )
  select jsonb_build_object(
    'friend_count', (select count(*) from friends),
    'friends', case when (select can_view from visibility) then coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'display_name', p.display_name) order by p.display_name, p.id)
      from public.profiles p join friends f on f.id = p.id
    ), '[]'::jsonb) end,
    'hackathon_count', (select count(distinct h.event_url) from public.hackathon_listings h
      where h.owner_id = target and h.status = 'participating'),
    'project_count', (select count(*) from public.team_posts t where not t.is_demo
      and (t.owner_id = target or exists (select 1 from public.applications a
        where a.team_post_id = t.id and a.applicant_id = target and a.status = 'accepted')))
  );
$$;
revoke all on function public.builder_activity(uuid) from public;
grant execute on function public.builder_activity(uuid) to anon, authenticated;

commit;
