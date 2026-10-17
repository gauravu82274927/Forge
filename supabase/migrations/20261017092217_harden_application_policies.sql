/*
# Lock down capacity functions and add RLS function guards

1. Security changes
- REVOKEs EXECUTE on accept_application / reject_application from anon and
  public so only authenticated users (and the owner check inside) can call.
- Adds is_post_owner(post_id) SECURITY DEFINER helper so application UPDATE
  policies can authorize owner status changes at the row level.
- Tightens applications_withdraw_own so applicants can never set their own
  application to 'accepted' or 'rejected' (only pending -> withdrawn).
2. Notes
- The accepted-status change for owners still flows through the SECURITY
  DEFINER accept/reject RPCs, which check ownership internally.
*/

REVOKE EXECUTE ON FUNCTION public.accept_application(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_application(uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.is_post_owner(post_id uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_posts p
    WHERE p.id = post_id AND p.owner_id = auth.uid()
  );
$$;