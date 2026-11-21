begin;

create table public.team_invitations (
  team_post_id uuid not null references public.team_posts(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (team_post_id, recipient_id),
  check (sender_id <> recipient_id)
);
create index team_invitations_inbox_idx on public.team_invitations (recipient_id, created_at desc);
alter table public.team_invitations enable row level security;
revoke all on public.team_invitations from public, anon, authenticated;
grant select on public.team_invitations to authenticated;
create policy "Read own team invitations" on public.team_invitations
for select to authenticated using (auth.uid() in (sender_id, recipient_id));

create function public.invite_to_team(target_team uuid, target_recipient uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  listing public.team_posts;
  sender uuid := auth.uid();
begin
  select * into listing from public.team_posts where id = target_team for update;
  if sender is null or not found or listing.owner_id is distinct from sender then
    raise exception 'Only the listing owner can invite teammates.' using errcode = '42501';
  end if;
  if target_recipient is null or target_recipient = sender then
    raise exception 'Choose another teammate.';
  end if;
  if exists (select 1 from public.team_invitations i where i.team_post_id = target_team and i.recipient_id = target_recipient) then
    return;
  end if;
  if listing.status <> 'open' or listing.deadline < current_date or
      (select count(*) from public.applications a where a.team_post_id = target_team and a.status = 'accepted') >= listing.open_positions then
    raise exception 'This listing is no longer accepting teammates.';
  end if;
  if exists (select 1 from public.applications a where a.team_post_id = target_team and a.applicant_id = target_recipient) then
    raise exception 'This person already has an application for this listing.';
  end if;
  insert into public.team_invitations (team_post_id, recipient_id, sender_id)
  values (target_team, target_recipient, sender);
end;
$$;
revoke all on function public.invite_to_team(uuid, uuid) from public, anon;
grant execute on function public.invite_to_team(uuid, uuid) to authenticated;

commit;
