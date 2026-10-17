-- Removes the demo accounts, profiles and sample team listings.
-- Run once in the Supabase SQL Editor. Safe to re-run.
-- Deleting the demo auth users also cascades to their profiles,
-- team_posts and any applications on those listings.
DELETE FROM public.team_posts WHERE is_demo = true;
DELETE FROM auth.users WHERE email LIKE '%.demo@forge.example';
DELETE FROM public.profiles WHERE is_demo = true;
