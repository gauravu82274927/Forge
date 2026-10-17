/*
# Replace counts view with a SECURITY DEFINER function

The security_invoker view hid all rows from anon visitors because the
applications table has no anon SELECT policy (correctly). A SECURITY DEFINER
function exposes only aggregated counts — never identities — to everyone.
*/

DROP VIEW IF EXISTS public.team_post_counts;

CREATE OR REPLACE FUNCTION public.team_post_accepted_counts()
RETURNS TABLE (team_post_id uuid, accepted_count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT team_post_id, count(*)::bigint AS accepted_count
  FROM public.applications
  WHERE status = 'accepted'
  GROUP BY team_post_id;
$$;

REVOKE ALL ON FUNCTION public.team_post_accepted_counts() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.team_post_accepted_counts() TO anon, authenticated;

NOTIFY pgrst, 'reload schema';