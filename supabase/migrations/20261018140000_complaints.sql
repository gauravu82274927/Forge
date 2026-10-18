/*
# Complaints and feedback from the assistant

1. New table
- `complaints` (id, user_id, category, details, contact_email, page_url, status, created_at)
  Filed from the AI assistant's "Raise a complaint" form. Signed-out visitors
  can file too (user_id stays null, they can leave an email to be contacted).

2. Security
- RLS on. Anyone (anon or signed in) can INSERT, with size limits enforced by CHECKs.
- Signed-in users can read only their own complaints. Nobody can edit or delete
  through the API. Review them in the Supabase Table Editor (which bypasses RLS).
- `user_id` can only be null or the caller's own id.
*/

CREATE TABLE IF NOT EXISTS public.complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('bug','abuse','listing','account','other')),
  details text NOT NULL CHECK (char_length(btrim(details)) BETWEEN 10 AND 2000),
  contact_email text CHECK (contact_email IS NULL OR char_length(contact_email) <= 200),
  page_url text CHECK (page_url IS NULL OR char_length(page_url) <= 500),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_review','resolved')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS complaints_status_idx ON public.complaints (status, created_at DESC);

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "complaints_insert_any" ON public.complaints;
CREATE POLICY "complaints_insert_any" ON public.complaints FOR INSERT
TO anon, authenticated
WITH CHECK (status = 'new' AND (user_id IS NULL OR user_id = auth.uid()));

DROP POLICY IF EXISTS "complaints_read_own" ON public.complaints;
CREATE POLICY "complaints_read_own" ON public.complaints FOR SELECT
TO authenticated USING (user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
