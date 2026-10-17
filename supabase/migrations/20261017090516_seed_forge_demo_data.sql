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