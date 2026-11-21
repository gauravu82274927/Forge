BEGIN;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE SCHEMA IF NOT EXISTS forge_match;
REVOKE ALL ON SCHEMA forge_match FROM PUBLIC;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536),
  ADD COLUMN IF NOT EXISTS match_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS embedding_attempted_at timestamptz;
ALTER TABLE public.team_posts ADD COLUMN IF NOT EXISTS embedding extensions.vector(1536),
  ADD COLUMN IF NOT EXISTS match_text text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS embedding_attempted_at timestamptz;
CREATE INDEX IF NOT EXISTS profiles_embedding_hnsw ON public.profiles USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS team_posts_embedding_hnsw ON public.team_posts USING hnsw (embedding extensions.vector_cosine_ops);
CREATE INDEX IF NOT EXISTS applications_accepted_match_idx ON public.applications(team_post_id) WHERE status = 'accepted';

CREATE OR REPLACE FUNCTION forge_match.normalize(tags text[]) RETURNS text[]
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT coalesce(array_agg(DISTINCT lower(btrim(tag)) ORDER BY lower(btrim(tag))), '{}')
 FROM unnest(tags) tag WHERE btrim(tag) <> '';
$$;

-- Compute the canonical input in the database; never accept client-supplied vectors.
CREATE OR REPLACE FUNCTION forge_match.sync_input() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE input text;
BEGIN
 IF TG_TABLE_NAME = 'profiles' THEN
   input := concat_ws(' ', NEW.bio, array_to_string(NEW.skills, ', '),
     array_to_string(NEW.interests, ', '), array_to_string(NEW.preferred_roles, ', '));
 ELSE
   input := concat_ws(' ', NEW.title, NEW.summary, NEW.description, NEW.category,
     array_to_string(NEW.required_skills, ', '), array_to_string(NEW.open_roles, ', '));
 END IF;
 NEW.match_text := left(btrim(input), 6000);
 IF TG_OP = 'INSERT' THEN
   NEW.embedding := NULL;
   NEW.embedding_attempted_at := NULL;
 ELSE
   IF coalesce(auth.role(), '') <> 'service_role' THEN
     NEW.embedding := OLD.embedding;
     NEW.embedding_attempted_at := OLD.embedding_attempted_at;
   END IF;
   IF NEW.match_text IS DISTINCT FROM OLD.match_text THEN NEW.embedding := NULL; END IF;
 END IF;
 RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS match_input ON public.profiles;
CREATE TRIGGER match_input BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION forge_match.sync_input();
DROP TRIGGER IF EXISTS match_input ON public.team_posts;
CREATE TRIGGER match_input BEFORE INSERT OR UPDATE ON public.team_posts FOR EACH ROW EXECUTE FUNCTION forge_match.sync_input();
UPDATE public.profiles SET match_text = match_text;
UPDATE public.team_posts SET match_text = match_text;

-- A per-record atomic lease bounds concurrent requests and API retries to once/minute.
CREATE OR REPLACE FUNCTION public.claim_match_embedding(p_kind text, p_id uuid)
RETURNS TABLE(input text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF p_kind = 'profile' THEN
   RETURN QUERY UPDATE public.profiles SET embedding_attempted_at = now()
   WHERE id = p_id AND embedding IS NULL AND match_text <> ''
     AND (embedding_attempted_at IS NULL OR embedding_attempted_at < now() - interval '1 minute')
   RETURNING match_text;
 ELSIF p_kind = 'team' THEN
   RETURN QUERY UPDATE public.team_posts SET embedding_attempted_at = now()
   WHERE id = p_id AND embedding IS NULL AND match_text <> ''
     AND (embedding_attempted_at IS NULL OR embedding_attempted_at < now() - interval '1 minute')
   RETURNING match_text;
 ELSE RAISE EXCEPTION 'Invalid kind';
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_match_embedding(text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_match_embedding(text, uuid) TO service_role;

CREATE OR REPLACE FUNCTION forge_match.hours(value text) RETURNS numeric
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT CASE value WHEN '2-4 hrs/week' THEN 3 WHEN '5-8 hrs/week' THEN 6.5
 WHEN '8-12 hrs/week' THEN 10 WHEN '10-15 hrs/week' THEN 12.5
 WHEN '15+ hrs/week' THEN 15 ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION forge_match.gaps(t public.team_posts) RETURNS text[]
LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT ARRAY(SELECT unnest(forge_match.normalize(t.required_skills)) EXCEPT
 SELECT unnest(forge_match.normalize(p.skills)) FROM public.profiles p
 WHERE p.id = t.owner_id OR EXISTS(SELECT 1 FROM public.applications a
 WHERE a.team_post_id = t.id AND a.applicant_id = p.id AND a.status = 'accepted') ORDER BY 1);
$$;

CREATE OR REPLACE FUNCTION forge_match.score(p public.profiles, t public.team_posts, gaps text[])
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE
 matched text[]; semantic numeric; skills numeric; experience numeric; commitment numeric;
 ph numeric := forge_match.hours(p.availability); th numeric := forge_match.hours(t.commitment);
 pi int := array_position(ARRAY['beginner','intermediate','advanced'], p.experience_level);
 ti int := array_position(ARRAY['beginner','intermediate','advanced'], t.experience_level);
 use_vector boolean := p.embedding IS NOT NULL AND t.embedding IS NOT NULL;
BEGIN
 SELECT ARRAY(SELECT unnest(forge_match.normalize(p.skills)) INTERSECT SELECT unnest(gaps) ORDER BY 1) INTO matched;
 semantic := CASE WHEN use_vector THEN greatest(0, least(1, 1 - (p.embedding OPERATOR(extensions.<=>) t.embedding))) * 100
   ELSE extensions.similarity(p.match_text, t.match_text) * 100 END;
 -- No remaining requirement is a neutral fit, not a division-by-zero or a perfect score.
 skills := CASE WHEN cardinality(gaps) = 0 THEN 50 ELSE 100.0 * cardinality(matched) / cardinality(gaps) END;
 experience := CASE WHEN t.experience_level = 'any' THEN 100 WHEN pi IS NULL OR ti IS NULL THEN 50
   WHEN pi = ti THEN 100 WHEN abs(pi-ti) = 1 THEN 60 ELSE 20 END;
 commitment := CASE WHEN p.availability = 'flexible' OR t.commitment = 'flexible' THEN 100
   WHEN ph IS NULL OR th IS NULL THEN 50 ELSE 100 * least(ph, th) / greatest(ph, th) END;
 RETURN jsonb_build_object('score', round(.4*semantic + .3*skills + .15*experience + .15*commitment),
   'semantic_score', round(semantic), 'skills_score', round(skills),
   'experience_score', experience, 'commitment_score', round(commitment),
   'method', CASE WHEN use_vector THEN 'semantic' ELSE 'keyword' END,
   'matched_skills', matched, 'missing_skills', ARRAY(SELECT unnest(gaps) EXCEPT SELECT unnest(matched) ORDER BY 1));
END;
$$;

CREATE OR REPLACE FUNCTION public.match_teams_for_user(p_user_id uuid DEFAULT auth.uid(), p_limit int DEFAULT 6)
RETURNS TABLE(id uuid, title text, subtitle text, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE person public.profiles;
BEGIN
 IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'You can only request your own matches' USING ERRCODE = '42501';
 END IF;
 SELECT * INTO person FROM public.profiles WHERE profiles.id = p_user_id;
 IF NOT FOUND THEN RETURN; END IF;
 RETURN QUERY
 SELECT t.id, t.title, t.summary, forge_match.score(person, t, forge_match.gaps(t))
 FROM public.team_posts t
 WHERE t.owner_id <> p_user_id AND t.status = 'open'
 AND (t.deadline IS NULL OR t.deadline >= current_date)
 AND (SELECT count(*) FROM public.applications a WHERE a.team_post_id = t.id AND a.status = 'accepted') < t.open_positions
 AND NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.team_post_id = t.id
   AND a.applicant_id = p_user_id AND a.status IN ('pending','accepted','rejected','withdrawn'))
 ORDER BY (forge_match.score(person,t,forge_match.gaps(t))->>'score')::numeric DESC, t.created_at DESC, t.id
 LIMIT greatest(1, least(coalesce(p_limit,6),20));
END;
$$;

CREATE OR REPLACE FUNCTION public.match_users_for_team(p_team_id uuid, p_limit int DEFAULT 6)
RETURNS TABLE(id uuid, title text, subtitle text, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE team public.team_posts; gaps text[];
BEGIN
 SELECT * INTO team FROM public.team_posts WHERE team_posts.id = p_team_id;
 IF auth.uid() IS NULL OR team.owner_id IS DISTINCT FROM auth.uid() THEN
   RAISE EXCEPTION 'Only the listing owner can request teammate matches' USING ERRCODE = '42501';
 END IF;
 IF team.status <> 'open' OR team.deadline < current_date OR
   (SELECT count(*) FROM public.applications a WHERE a.team_post_id = team.id AND a.status = 'accepted') >= team.open_positions THEN RETURN; END IF;
 gaps := forge_match.gaps(team);
 RETURN QUERY SELECT p.id, p.display_name, coalesce(p.bio, p.college, ''), forge_match.score(p,team,gaps)
 FROM public.profiles p WHERE p.id <> team.owner_id
 AND (cardinality(p.skills) > 0 OR btrim(coalesce(p.bio,'')) <> '')
 AND NOT EXISTS (SELECT 1 FROM public.applications a WHERE a.team_post_id = team.id
   AND a.applicant_id = p.id AND a.status IN ('pending','accepted','rejected','withdrawn'))
 ORDER BY (forge_match.score(p,team,gaps)->>'score')::numeric DESC, p.id
 LIMIT greatest(1,least(coalesce(p_limit,6),20));
END;
$$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA forge_match FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_teams_for_user(uuid,int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_users_for_team(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_teams_for_user(uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_users_for_team(uuid,int) TO authenticated;
COMMIT;
