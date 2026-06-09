
-- 1. Unique constraint so ON CONFLICT works (dedupe first if any dupes exist)
DELETE FROM public.contacts a USING public.contacts b
  WHERE a.ctid < b.ctid
    AND a.user_id = b.user_id
    AND a.contact_user_id = b.contact_user_id;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_user_contact_uniq UNIQUE (user_id, contact_user_id);

-- 2. Harden accept_contact_request: explicit upserts, no silent swallow
CREATE OR REPLACE FUNCTION public.accept_contact_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  r RECORD;
  p_from RECORD;
  p_to   RECORD;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO r FROM public.contact_requests WHERE id = request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.to_user <> caller THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF r.status NOT IN ('pending','accepted') THEN RAISE EXCEPTION 'request not pending'; END IF;

  UPDATE public.contact_requests SET status = 'accepted' WHERE id = request_id;

  SELECT id, display_name, username, phone, avatar_url INTO p_from FROM public.profiles WHERE id = r.from_user;
  SELECT id, display_name, username, phone, avatar_url INTO p_to   FROM public.profiles WHERE id = r.to_user;

  INSERT INTO public.contacts (user_id, contact_user_id, name, phone, username, confirmed)
  VALUES (r.to_user, r.from_user,
          coalesce(p_from.display_name, p_from.username, 'Contact'),
          p_from.phone, p_from.username, true)
  ON CONFLICT (user_id, contact_user_id)
    DO UPDATE SET confirmed = true,
                  name = EXCLUDED.name,
                  phone = COALESCE(EXCLUDED.phone, public.contacts.phone),
                  username = COALESCE(EXCLUDED.username, public.contacts.username),
                  updated_at = now();

  INSERT INTO public.contacts (user_id, contact_user_id, name, phone, username, confirmed)
  VALUES (r.from_user, r.to_user,
          coalesce(p_to.display_name, p_to.username, 'Contact'),
          p_to.phone, p_to.username, true)
  ON CONFLICT (user_id, contact_user_id)
    DO UPDATE SET confirmed = true,
                  name = EXCLUDED.name,
                  phone = COALESCE(EXCLUDED.phone, public.contacts.phone),
                  username = COALESCE(EXCLUDED.username, public.contacts.username),
                  updated_at = now();
END;
$$;

-- 3. Message tick columns
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_at      timestamptz,
  ADD COLUMN IF NOT EXISTS status       text NOT NULL DEFAULT 'sent';

DO $$ BEGIN
  ALTER TABLE public.messages
    ADD CONSTRAINT messages_status_chk
    CHECK (status IN ('sending','sent','delivered','read','failed'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow recipients to update delivered/read flags on messages addressed to them
DROP POLICY IF EXISTS "Recipients update tick status" ON public.messages;
CREATE POLICY "Recipients update tick status"
  ON public.messages FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- 4. RPCs the client calls to set delivery/read state in bulk
CREATE OR REPLACE FUNCTION public.mark_messages_delivered(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.messages
     SET delivered_at = COALESCE(delivered_at, now()),
         status = CASE WHEN status = 'read' THEN 'read' ELSE 'delivered' END
   WHERE conversation_id = p_conversation_id
     AND recipient_id = caller
     AND delivered_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  UPDATE public.messages
     SET delivered_at = COALESCE(delivered_at, now()),
         read_at      = COALESCE(read_at, now()),
         status       = 'read'
   WHERE conversation_id = p_conversation_id
     AND recipient_id = caller
     AND read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_messages_delivered(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_messages_read(uuid)      TO authenticated;
