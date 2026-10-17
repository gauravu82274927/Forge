/*
# Friendships

1. New table
- `friendships` (id, requester_id, addressee_id, status 'pending'|'accepted', timestamps)
  One row per pair of users (either direction), enforced with a unique index.

2. Security
- RLS on. Only the two people involved can see a row.
- Anyone signed in can send a request (as themselves, status 'pending').
- Accepting goes through `accept_friend_request` (addressee only), so nobody
  can edit the requester/addressee columns directly. There is no UPDATE policy.
- Either person can delete the row (cancel, decline, or unfriend).
*/

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_idx
  ON public.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON public.friendships (addressee_id);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "friendships_read_involved" ON public.friendships;
CREATE POLICY "friendships_read_involved" ON public.friendships FOR SELECT
TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "friendships_insert_own" ON public.friendships;
CREATE POLICY "friendships_insert_own" ON public.friendships FOR INSERT
TO authenticated WITH CHECK (auth.uid() = requester_id AND status = 'pending');

DROP POLICY IF EXISTS "friendships_delete_involved" ON public.friendships;
CREATE POLICY "friendships_delete_involved" ON public.friendships FOR DELETE
TO authenticated USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.friendships
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id AND addressee_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Friend request not found or already handled';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_friend_request(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.accept_friend_request(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
