/*
# Profile pictures

1. Changes
- `profiles.avatar_url`: public URL of the user's picture (nullable).
- Storage bucket `avatars` (public, 2 MB limit, JPG/PNG/WebP only).

2. Security
- Anyone can view a picture through its public URL (profiles are public).
- Only the signed-in owner can upload, replace or delete files, and only inside
  their own folder: avatars/<their user id>/...
- `avatar_url` must point at a file inside the user's own folder in this bucket,
  so a profile can never be pointed at an outside image or someone else's file.
- There is no SELECT policy for the public, so the bucket cannot be listed.
*/

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_avatar_url_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_avatar_url_check CHECK (
  avatar_url IS NULL
  OR (
    char_length(avatar_url) <= 500
    AND avatar_url LIKE ('https://%/storage/v1/object/public/avatars/' || id::text || '/%')
  )
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;
CREATE POLICY "avatars_select_own" ON storage.objects FOR SELECT
TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_insert_own" ON storage.objects;
CREATE POLICY "avatars_insert_own" ON storage.objects FOR INSERT
TO authenticated WITH CHECK (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "avatars_update_own" ON storage.objects;
CREATE POLICY "avatars_update_own" ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "avatars_delete_own" ON storage.objects;
CREATE POLICY "avatars_delete_own" ON storage.objects FOR DELETE
TO authenticated USING (
  bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
);

NOTIFY pgrst, 'reload schema';
