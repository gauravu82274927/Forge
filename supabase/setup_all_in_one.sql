-- Forge: all migrations combined, in order. Paste into Supabase SQL Editor and run once.
-- Generated from supabase/migrations (superseded 120000/120100 versions excluded).

-- ===== 20261017090324_create_forge_core_schema.sql =====
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

-- ===== 20261017090516_seed_forge_demo_data.sql =====
/*
# Forge — demo seed data (retry with upsert)

1. Purpose
- Creates three demo user accounts with filled-in profiles and six realistic
  demo team listings spanning AI, open source, mobile, sustainability, web.
2. Change from previous attempt
- The signup trigger auto-creates profile rows when demo users are inserted,
  so profile seeding now uses ON CONFLICT ... DO UPDATE instead of a plain
  INSERT to avoid a primary-key conflict.
3. Security
- Demo accounts have long random passwords that are never exposed in the app.
4. Notes
- Idempotent: seeds only when the team_posts table is empty.
*/

DO $$
DECLARE
  u1 uuid; u2 uuid; u3 uuid;
  pass text;
BEGIN
  IF (SELECT count(*) FROM team_posts) > 0 THEN
    RETURN;
  END IF;

  pass := crypt('forge-demo-' || gen_random_uuid()::text, gen_salt('bf'));

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'maya.chen.demo@forge.example', pass, now(), '{"provider":"email","providers":["email"]}',
    '{"display_name":"Maya Chen"}', now(), now())
  RETURNING id INTO u1;

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'arjun.patel.demo@forge.example', pass, now(), '{"provider":"email","providers":["email"]}',
    '{"display_name":"Arjun Patel"}', now(), now())
  RETURNING id INTO u2;

  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  VALUES ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    'sofia.reyes.demo@forge.example', pass, now(), '{"provider":"email","providers":["email"]}',
    '{"display_name":"Sofia Reyes"}', now(), now())
  RETURNING id INTO u3;

  INSERT INTO profiles (id, display_name, college, course, graduation_year, bio, skills, interests, experience_level, github_url, preferred_roles, availability)
  VALUES
    (u1, 'Maya Chen', 'Demo University', 'Computer Science', 2026,
     'Third-year CS student. I like building tools people actually use, and I care a lot about clean UI.',
     ARRAY['React','TypeScript','Next.js','Figma'], ARRAY['Developer tools','AI','Design systems'],
     'intermediate', 'https://github.com/demo-maya', ARRAY['Frontend','Product'], '10+ hrs/week'),
    (u2, 'Arjun Patel', 'Demo Institute of Technology', 'Data Science', 2027,
     'Data science student exploring applied ML. Currently deep in PyTorch and LLM fine-tuning.',
     ARRAY['Python','PyTorch','FastAPI','PostgreSQL'], ARRAY['AI/ML','Open source','Research'],
     'advanced', 'https://github.com/demo-arjun', ARRAY['Backend','ML Engineer'], '15+ hrs/week'),
    (u3, 'Sofia Reyes', 'Demo State College', 'HCI / Design', 2025,
     'Designer who codes. I run user interviews for fun and believe prototypes beat meetings.',
     ARRAY['Figma','SwiftUI','React Native','User research'], ARRAY['Mobile apps','Accessibility','Education'],
     'intermediate', 'https://github.com/demo-sofia', ARRAY['Design','Mobile'], '8+ hrs/week')
  ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    college = EXCLUDED.college,
    course = EXCLUDED.course,
    graduation_year = EXCLUDED.graduation_year,
    bio = EXCLUDED.bio,
    skills = EXCLUDED.skills,
    interests = EXCLUDED.interests,
    experience_level = EXCLUDED.experience_level,
    github_url = EXCLUDED.github_url,
    preferred_roles = EXCLUDED.preferred_roles,
    availability = EXCLUDED.availability;

  INSERT INTO team_posts (owner_id, title, summary, description, category, required_skills, open_roles,
    open_positions, commitment, experience_level, deadline, collaboration_format, application_instructions, status)
  VALUES
    (u2, 'AI-Powered Study Planner',
     'A study planner that learns how you actually study and builds a realistic schedule around your deadlines.',
     E'We are building an AI-powered study planner that turns syllabi, deadlines, and past behavior into a schedule students can actually keep.\n\nProblem: existing planners are calendar tools. They do not adapt when you fall behind, and they ignore how long tasks really take.\n\nGoals for the next 8 weeks:\n- Ship a working web app with deadline import and auto-scheduling\n- Build a lightweight model that estimates task duration from history\n- Run a pilot with 20 students and iterate\n\nWe meet twice a week over video and keep everything in a shared repo with clear tasks. Beginners who are reliable and curious are welcome — we pair on hard problems.',
     'AI / ML',
     ARRAY['Python','React','LLM APIs'], ARRAY['ML Engineer','Frontend Developer'],
     2, '10-15 hrs/week', 'intermediate', (CURRENT_DATE + 30)::date, 'remote-flexible',
     'Tell us about a project you finished and what you would do differently. Links to code welcome.', 'open'),

    (u1, 'Open-Source CLI for API Testing',
     'A fast, keyboard-first command-line tool for exploring and testing REST APIs, written in Rust.',
     E'We are starting an open-source CLI for developers who live in the terminal: chain requests, extract values, replay flows, and share collections as plain files.\n\nProblem: API testing tools are heavy GUI apps. Terminal-first developers deserve a fast, scriptable alternative.\n\nGoals:\n- Core request engine with environment and secret handling\n- A readable collection format (TOML) with git-friendly diffs\n- First public release on crates.io\n\nThis is a genuine open-source project — good first issues, clear contribution guide, and credit for every merged PR.',
     'Open Source',
     ARRAY['Rust','CLI design','HTTP'], ARRAY['Rust Developer','Documentation'],
     2, '5-10 hrs/week', 'intermediate', (CURRENT_DATE + 45)::date, 'remote-async',
     'Mention any Rust or CLI experience (even course projects). Open-source contributions are a plus but not required.', 'open'),

    (u3, 'Student Productivity App (SwiftUI)',
     'A calm, distraction-free iOS app that helps students plan their day in under two minutes.',
     E'We are building a native iOS productivity app designed around one idea: planning should take two minutes, not twenty.\n\nProblem: most productivity apps are built for knowledge workers with fixed schedules. Students need something that survives schedule chaos.\n\nGoals:\n- SwiftUI prototype with widgets and a today view\n- TestFlight beta by end of term\n- App Store submission if the beta goes well\n\nLooking for one more iOS developer and someone who enjoys design QA. You will ship real Swift code from week one.',
     'Mobile App',
     ARRAY['Swift','SwiftUI','iOS'], ARRAY['iOS Developer','Design QA'],
     2, '8-12 hrs/week', 'intermediate', (CURRENT_DATE + 25)::date, 'hybrid',
     'Share an app or project you built (school projects count). Tell us your favorite iOS app and why.', 'open'),

    (u1, 'Sustainability Footprint Tracker',
     'A web app that helps student clubs measure and reduce the carbon footprint of their events.',
     E'We are building a tool for student organizations to estimate the footprint of their events — travel, food, energy — and find concrete reductions.\n\nProblem: clubs want to run sustainable events but have no simple way to measure anything.\n\nGoals:\n- Event calculator with transparent, sourced emission factors\n- Club dashboard with history and comparisons\n- Partnership with two campus clubs as pilot users\n\nThe data model and math matter here, so we want someone who enjoys getting details right.',
     'Sustainability',
     ARRAY['TypeScript','PostgreSQL','Data analysis'], ARRAY['Fullstack Developer','Data Researcher'],
     2, '6-10 hrs/week', 'beginner', (CURRENT_DATE + 40)::date, 'remote-flexible',
     'Tell us why sustainability matters to you and one idea for making events greener on your campus.', 'open'),

    (u2, 'Developer Tool: Config Linter',
     'An open-source linter that catches misconfigurations in CI pipelines before they break your build.',
     E'We are building a linter for CI configuration files: catch unused secrets, flaky patterns, missing caches, and unsafe defaults before they reach your pipeline.\n\nProblem: CI configs are written once and break mysteriously later. Almost no tooling exists for them.\n\nGoals:\n- Parsers for the two most common CI formats\n- 15 high-signal rules with clear fix suggestions\n- GitHub Action for one-line setup\n\nWe work fully async in the open. Every design decision lands in a public RFC issue first.',
     'Open Source',
     ARRAY['TypeScript','Node.js','AST parsing'], ARRAY['Backend Developer','Technical Writer'],
     2, '5-8 hrs/week', 'intermediate', (CURRENT_DATE + 60)::date, 'remote-async',
     'Point us to any parser, compiler, or tooling work you have done — even assignments are fine.', 'open'),

    (u3, 'Campus Events Discovery Web App',
     'A clean, fast web app that aggregates campus events so students stop missing things they care about.',
     E'We are building a campus events discovery app: one feed that pulls from club pages, posters, and word of mouth, with real filters by interest and time.\n\nProblem: campus events live in a dozen scattered channels and most students find out after they happen.\n\nGoals:\n- Working search and filters over a curated event dataset\n- Submission flow for club organizers\n- Weekly digest email\n\nWe need a frontend developer who cares about polish and a backend developer for ingestion. Design direction is already sketched — you will help refine it, not start from a blank page.',
     'Web App',
     ARRAY['React','Next.js','Tailwind CSS'], ARRAY['Frontend Developer','Backend Developer'],
     2, '8-10 hrs/week', 'any', (CURRENT_DATE + 35)::date, 'remote-flexible',
     'Show us a frontend project you are proud of. Tell us one thing you would improve about how your campus shares events.', 'open');
END $$;

-- ===== 20261017092217_harden_application_policies.sql =====
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

-- ===== 20261017133646_20261017120000_forge_fixes.sql =====
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

-- ===== 20261017133702_20261017120100_team_post_counts.sql =====
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

-- ===== 20261017133729_20261017120200_counts_function.sql =====
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
NOTIFY pgrst, 'reload schema';
