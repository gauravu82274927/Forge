/*
# Public accepted-member counts

Row level security hides other people's applications, so non-involved users saw
0 accepted members. This view exposes counts only (never who was accepted).
*/

CREATE OR REPLACE VIEW public.team_post_counts AS
SELECT team_post_id, count(*)::int AS accepted_count
FROM public.applications
WHERE status = 'accepted'
GROUP BY team_post_id;

GRANT SELECT ON public.team_post_counts TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
