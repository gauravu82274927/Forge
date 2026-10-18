/*
# LeetCode link on profiles

- `profiles.leetcode_url`: the member's LeetCode profile link (nullable, max 200 chars).
  Shown on their public profile next to GitHub, and used to draw the activity heatmap.
- No policy changes: profiles are already publicly readable and only the owner can edit their row.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS leetcode_url text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_leetcode_url_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_leetcode_url_check
  CHECK (leetcode_url IS NULL OR char_length(leetcode_url) <= 200);

NOTIFY pgrst, 'reload schema';
