begin;

alter table public.team_invitations add column if not exists status text not null default 'pending'
  check (status in ('pending', 'accepted', 'declined'));

create or replace function public.respond_to_team_invitation(target_team uuid, accept_invitation boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid := auth.uid();
  listing public.team_posts;
  invitation public.team_invitations;
  existing_status text;
  desired_status text := case when accept_invitation then 'accepted' else 'declined' end;
  accepted_count integer;
begin
  if recipient is null or accept_invitation is null then
    raise exception 'Sign in and choose a response.';
  end if;

  select * into listing from public.team_posts where id = target_team for update;
  select * into invitation from public.team_invitations
    where team_post_id = target_team and recipient_id = recipient for update;
  if not found then
    raise exception 'Invitation unavailable.' using errcode = '42501';
  end if;
  if invitation.status = desired_status then return; end if;
  if invitation.status <> 'pending' then raise exception 'This invitation has already been answered.'; end if;

  if accept_invitation then
    if invitation.sender_id is distinct from listing.owner_id then
      raise exception 'This invitation is no longer valid.';
    end if;

    select a.status into existing_status from public.applications a
      where a.team_post_id = target_team and a.applicant_id = recipient for update;
    if existing_status is distinct from 'accepted' then
      if existing_status is not null and existing_status <> 'pending' then
        raise exception 'This application has already been closed.';
      end if;
      select count(*) into accepted_count from public.applications a
        where a.team_post_id = target_team and a.status = 'accepted';
      if listing.status <> 'open' or listing.deadline < current_date or accepted_count >= listing.open_positions then
        raise exception 'This listing is no longer accepting teammates.';
      end if;
      if existing_status = 'pending' then
        update public.applications set status = 'accepted', updated_at = now()
          where team_post_id = target_team and applicant_id = recipient;
      else
        insert into public.applications (team_post_id, applicant_id, intro_message, status)
        values (target_team, recipient, 'Joined by accepting a team invitation.', 'accepted');
      end if;
      update public.team_posts
        set status = case when accepted_count + 1 >= listing.open_positions then 'closed' else 'open' end,
            updated_at = now()
        where id = target_team;
    end if;
  end if;

  update public.team_invitations set status = desired_status
    where team_post_id = target_team and recipient_id = recipient;
end;
$$;

revoke all on function public.respond_to_team_invitation(uuid, boolean) from public, anon;
grant execute on function public.respond_to_team_invitation(uuid, boolean) to authenticated;

commit;
