/*
# Messages and notifications

1. New table
- `messages` (id, sender_id, recipient_id, body, created_at, read_at): 1-to-1 chat.

2. Changes
- `profiles.notifications_seen_at`: when the user last opened the notification
  panel, used to tell which application updates are new.

3. Security
- RLS on. Only the sender and recipient can read a message.
- You can only send to someone you have an accepted friendship with, and only as yourself.
- There is no UPDATE or DELETE policy: read receipts go through
  `mark_conversation_read`, which only touches messages sent to the caller,
  so message text can never be edited.
*/

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS messages_recipient_idx ON public.messages (recipient_id, read_at);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON public.messages (sender_id, recipient_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_read_involved" ON public.messages;
CREATE POLICY "messages_read_involved" ON public.messages FOR SELECT
TO authenticated USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "messages_send_to_friend" ON public.messages;
CREATE POLICY "messages_send_to_friend" ON public.messages FOR INSERT
TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND read_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.friendships f
    WHERE f.status = 'accepted'
      AND ((f.requester_id = auth.uid() AND f.addressee_id = recipient_id)
        OR (f.addressee_id = auth.uid() AND f.requester_id = recipient_id))
  )
);

CREATE OR REPLACE FUNCTION public.mark_conversation_read(other_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.messages
  SET read_at = now()
  WHERE recipient_id = auth.uid() AND sender_id = other_id AND read_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notifications_seen_at timestamptz NOT NULL DEFAULT now();

NOTIFY pgrst, 'reload schema';
