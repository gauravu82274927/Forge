/*
# Forge — fixes: profile relationships, application rules, capacity race, demo labels

1. Fixes the dashboard error "Could not find a relationship between
   'team_posts' and 'profiles'" by pointing owner/applicant/reporter columns at profiles(id).
2. Enforces the brief's rules at the database level:
   - no applying to your own listing, to closed listings, or after the deadline
   - applications cannot be moved to a different listing
   - accept_application locks the listing row so simultaneous accepts cannot overfill it
   - owners cannot lower open_positions below the number already accepted
3. Adds length limits, updated_at triggers, search indexes.
4. Adds is_demo flags so demo data can be labeled in the UI and removed before launch.

Notes
- Idempotent where practical.
*/

-- 0. Make sure every auth user has a profile row before adding the new foreign keys.
INSERT INTO public.profiles (id, display_name)
SELECT u.id, split_part(u.email, '@', 1)
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 1. Foreign keys to profiles (profiles.id already cascades from auth.users).
ALTER TABLE public.team_posts DROP CONSTRAINT IF EXISTS team_posts_owner_id_fkey;
ALTER TABLE public.team_posts
  ADD CONSTRAINT team_posts_owner_id_fkey
  FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_applicant_id_fkey;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_applicant_id_fkey
  FOREIGN KEY (applicant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reporter_id_fkey
  FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_reported_user_id_fkey
  FOREIGN KEY (reported_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Application insert rules: pending only, open listing, not your own, before deadline.
DROP POLICY IF EXISTS "applications_insert_own" ON public.applications;
CREATE POLICY "applications_insert_own" ON public.applications FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = applicant_id
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.team_posts p
    WHERE p.id = team_post_id
      AND p.status = 'open'
      AND p.owner_id <> auth.uid()
      AND (p.deadline IS NULL OR p.deadline >= current_date)
  )
);

-- Applications cannot be re-pointed at another listing or another applicant.
CREATE OR REPLACE FUNCTION public.applications_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_post_id <> OLD.team_post_id
     OR NEW.applicant_id <> OLD.applicant_id THEN
    RAISE EXCEPTION 'team_post_id and applicant_id cannot be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_guard_trg ON public.applications;
CREATE TRIGGER applications_guard_trg
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.applications_guard();

-- 3. Capacity-safe accept: lock the listing row, re-check status, auto-close when full.
CREATE OR REPLACE FUNCTION public.accept_application(app_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post team_posts;
  v_status text;
  v_accepted int;
BEGIN
  SELECT * INTO v_post FROM team_posts
  WHERE id = (SELECT team_post_id FROM applications WHERE id = app_id)
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_post.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the listing owner can accept applications';
  END IF;
  IF v_post.status <> 'open' THEN
    RAISE EXCEPTION 'This listing is closed';
  END IF;

  SELECT status INTO v_status FROM applications WHERE id = app_id;
  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'This application is no longer pending';
  END IF;

  SELECT count(*) INTO v_accepted
  FROM applications
  WHERE team_post_id = v_post.id AND status = 'accepted';

  IF v_accepted >= v_post.open_positions THEN
    RAISE EXCEPTION 'All positions for this listing are already filled';
  END IF;

  UPDATE applications SET status = 'accepted', updated_at = now() WHERE id = app_id;

  IF v_accepted + 1 >= v_post.open_positions THEN
    UPDATE team_posts SET status = 'closed', updated_at = now() WHERE id = v_post.id;
  ELSE
    UPDATE team_posts SET updated_at = now() WHERE id = v_post.id;
  END IF;

  RETURN 'accepted';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_application(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated;

-- Owners cannot shrink positions below the number already accepted.
CREATE OR REPLACE FUNCTION public.team_posts_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_accepted int;
BEGIN
  IF NEW.open_positions < OLD.open_positions THEN
    SELECT count(*) INTO v_accepted
    FROM applications WHERE team_post_id = NEW.id AND status = 'accepted';
    IF NEW.open_positions < v_accepted THEN
      RAISE EXCEPTION 'open_positions cannot be lower than accepted members (%)', v_accepted;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_posts_guard_trg ON public.team_posts;
CREATE TRIGGER team_posts_guard_trg
BEFORE UPDATE ON public.team_posts
FOR EACH ROW EXECUTE FUNCTION public.team_posts_guard();

-- 4. Length limits (stop oversized or abusive text).
ALTER TABLE public.team_posts DROP CONSTRAINT IF EXISTS team_posts_text_len;
ALTER TABLE public.team_posts ADD CONSTRAINT team_posts_text_len CHECK (
  char_length(title) BETWEEN 3 AND 120
  AND char_length(summary) <= 300
  AND char_length(description) <= 5000
);

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_msg_len;
ALTER TABLE public.applications ADD CONSTRAINT applications_msg_len CHECK (
  char_length(intro_message) BETWEEN 1 AND 1000
);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_text_len;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_text_len CHECK (
  char_length(display_name) BETWEEN 1 AND 80
  AND (bio IS NULL OR char_length(bio) <= 1000)
);

ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_text_len;
ALTER TABLE public.reports ADD CONSTRAINT reports_text_len CHECK (
  char_length(reason) BETWEEN 1 AND 200
  AND (details IS NULL OR char_length(details) <= 2000)
);

-- 5. updated_at maintained by the database.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS team_posts_set_updated_at ON public.team_posts;
CREATE TRIGGER team_posts_set_updated_at BEFORE UPDATE ON public.team_posts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS applications_set_updated_at ON public.applications;
CREATE TRIGGER applications_set_updated_at BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Search indexes for skill filtering.
CREATE INDEX IF NOT EXISTS team_posts_required_skills_gin
  ON public.team_posts USING gin (required_skills);
CREATE INDEX IF NOT EXISTS profiles_skills_gin
  ON public.profiles USING gin (skills);
CREATE INDEX IF NOT EXISTS applications_status_idx
  ON public.applications (team_post_id, status);

-- 7. Demo data flags (show a "Demo" badge in the UI; delete these rows before launch).
ALTER TABLE public.profiles   ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;
ALTER TABLE public.team_posts ADD COLUMN IF NOT EXISTS is_demo boolean NOT NULL DEFAULT false;

UPDATE public.profiles SET is_demo = true
WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%.demo@forge.example');

UPDATE public.team_posts SET is_demo = true
WHERE owner_id IN (SELECT id FROM public.profiles WHERE is_demo);

-- 8. Make PostgREST pick up the new relationships.
NOTIFY pgrst, 'reload schema';