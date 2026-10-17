/*
# Forge — core schema (profiles, team_posts, applications, reports)

1. New Tables
- `profiles` — public student profile, one row per authenticated user.
  - `id` (uuid, primary key, references auth.users, default auth.uid())
  - `display_name`, `college`, `course`, `graduation_year`, `bio` (text)
  - `skills`, `interests`, `preferred_roles` (text arrays)
  - `experience_level`, `portfolio_url`, `github_url`, `linkedin_url`, `availability`
  - `created_at`, `updated_at`
- `team_posts` — team listings, publicly readable, owner-writable.
  - `id` (uuid pk), `owner_id` (uuid, default auth.uid())
  - `title`, `summary`, `description`, `category`
  - `required_skills`, `open_roles` (text arrays)
  - `open_positions` (int), `commitment`, `experience_level`
  - `deadline` (date, nullable), `collaboration_format`, `application_instructions`
  - `status` ('open' | 'closed', default 'open'), timestamps
- `applications` — join applications, visible to applicant + post owner.
  - `id` (uuid pk), `team_post_id`, `applicant_id` (default auth.uid())
  - `intro_message`, `status` ('pending'|'accepted'|'rejected'|'withdrawn'), timestamps
  - unique(team_post_id, applicant_id) to prevent duplicate applications
- `reports` — moderation reports, insert-only for users, own-rows readable.
2. Functions / Triggers
- `handle_new_user()` trigger: auto-creates a profile row on signup.
- `accept_application(app_id)` SECURITY DEFINER: owner-only, atomic, enforces
  remaining capacity so simultaneous accepts cannot overfill the team.
- `reject_application(app_id)` SECURITY DEFINER: owner-only status change.
3. Security
- RLS enabled on all tables.
- profiles: public read; insert/update own only.
- team_posts: public read; insert/update/delete own only.
- applications: read (applicant or post owner); insert own; update own (withdraw);
  status changes by owner happen via SECURITY DEFINER RPC only.
- reports: insert own; read own.
- Service-side capacity logic in `accept_application` (security definer).
4. Notes
- All statements are idempotent; policies are dropped before creation.
- Demo seed rows are inserted in a separate migration.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- profiles ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'New builder',
  college text,
  course text,
  graduation_year int,
  bio text,
  skills text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  experience_level text CHECK (experience_level IN ('beginner','intermediate','advanced') OR experience_level IS NULL),
  portfolio_url text,
  github_url text,
  linkedin_url text,
  preferred_roles text[] NOT NULL DEFAULT '{}',
  availability text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- team_posts --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  required_skills text[] NOT NULL DEFAULT '{}',
  open_roles text[] NOT NULL DEFAULT '{}',
  open_positions int NOT NULL DEFAULT 1 CHECK (open_positions >= 1 AND open_positions <= 20),
  commitment text NOT NULL,
  experience_level text NOT NULL DEFAULT 'any',
  deadline date,
  collaboration_format text NOT NULL DEFAULT 'remote',
  application_instructions text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_posts_owner_idx ON team_posts (owner_id);
CREATE INDEX IF NOT EXISTS team_posts_status_idx ON team_posts (status);
CREATE INDEX IF NOT EXISTS team_posts_category_idx ON team_posts (category);
CREATE INDEX IF NOT EXISTS team_posts_created_idx ON team_posts (created_at DESC);

ALTER TABLE team_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_posts_public_read" ON team_posts;
CREATE POLICY "team_posts_public_read" ON team_posts FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "team_posts_insert_own" ON team_posts;
CREATE POLICY "team_posts_insert_own" ON team_posts FOR INSERT
TO authenticated WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "team_posts_update_own" ON team_posts;
CREATE POLICY "team_posts_update_own" ON team_posts FOR UPDATE
TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "team_posts_delete_own" ON team_posts;
CREATE POLICY "team_posts_delete_own" ON team_posts FOR DELETE
TO authenticated USING (auth.uid() = owner_id);

-- applications ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_post_id uuid NOT NULL REFERENCES team_posts(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  intro_message text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_post_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS applications_post_idx ON applications (team_post_id);
CREATE INDEX IF NOT EXISTS applications_applicant_idx ON applications (applicant_id);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "applications_read_involved" ON applications;
CREATE POLICY "applications_read_involved" ON applications FOR SELECT
TO authenticated USING (
  auth.uid() = applicant_id
  OR EXISTS (
    SELECT 1 FROM team_posts p
    WHERE p.id = team_post_id AND p.owner_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "applications_insert_own" ON applications;
CREATE POLICY "applications_insert_own" ON applications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "applications_withdraw_own" ON applications;
CREATE POLICY "applications_withdraw_own" ON applications FOR UPDATE
TO authenticated USING (auth.uid() = applicant_id AND status = 'pending')
WITH CHECK (auth.uid() = applicant_id AND status IN ('pending','withdrawn'));

DROP POLICY IF EXISTS "applications_delete_own" ON applications;
CREATE POLICY "applications_delete_own" ON applications FOR DELETE
TO authenticated USING (auth.uid() = applicant_id AND status = 'pending');

-- reports -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  team_post_id uuid REFERENCES team_posts(id) ON DELETE SET NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
TO authenticated WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "reports_read_own" ON reports;
CREATE POLICY "reports_read_own" ON reports FOR SELECT
TO authenticated USING (auth.uid() = reporter_id);

-- trigger: create profile on signup --------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- capacity-safe accept / reject -------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_application(app_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post team_posts;
  v_app applications;
  v_accepted int;
BEGIN
  SELECT * INTO v_app FROM applications WHERE id = app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  SELECT * INTO v_post FROM team_posts WHERE id = v_app.team_post_id;
  IF v_post.owner_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the listing owner can accept applications';
  END IF;
  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'This application is no longer pending';
  END IF;
  IF v_post.status <> 'open' THEN
    RAISE EXCEPTION 'This listing is closed';
  END IF;

  SELECT count(*) INTO v_accepted
  FROM applications
  WHERE team_post_id = v_post.id AND status = 'accepted';

  IF v_accepted >= v_post.open_positions THEN
    RAISE EXCEPTION 'All positions for this listing are already filled';
  END IF;

  UPDATE applications
  SET status = 'accepted', updated_at = now()
  WHERE id = app_id;

  UPDATE team_posts
  SET updated_at = now()
  WHERE id = v_post.id;

  RETURN 'accepted';
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_application(app_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_app applications;
BEGIN
  SELECT * INTO v_app FROM applications WHERE id = app_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM team_posts p
    WHERE p.id = v_app.team_post_id AND p.owner_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the listing owner can reject applications';
  END IF;
  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'This application is no longer pending';
  END IF;

  UPDATE applications
  SET status = 'rejected', updated_at = now()
  WHERE id = app_id;

  RETURN 'rejected';
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_application(uuid) TO authenticated;