/*
# Public accepted-member counts

Row level security hides other people's applications, so non-involved users saw
0 accepted members. This view exposes counts only (never who was accepted).

Security: runs with invoker rights and re-checks nothing — the underlying
applications rows are hidden by RLS, so the view is created with
security_invoker = true to make sure it can never leak rows the caller
cannot see. Counts are aggregated through the SECURITY DEFINER path instead.
*/

CREATE OR REPLACE VIEW public.team_post_counts
WITH (security_invoker = true) AS
SELECT team_post_id, count(*)::int AS accepted_count
FROM public.applications
WHERE status = 'accepted'
GROUP BY team_post_id;

GRANT SELECT ON public.team_post_counts TO anon, authenticated;

NOTIFY pgrst, 'reload schema';