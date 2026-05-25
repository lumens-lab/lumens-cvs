-- contact_requests table
CREATE TABLE public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contact_requests_not_self CHECK (from_user <> to_user),
  CONSTRAINT contact_requests_unique UNIQUE (from_user, to_user)
);

ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cr party read" ON public.contact_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "cr sender insert" ON public.contact_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = from_user);

CREATE POLICY "cr receiver update" ON public.contact_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = to_user)
  WITH CHECK (auth.uid() = to_user);

CREATE POLICY "cr party delete" ON public.contact_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE TRIGGER contact_requests_touch
  BEFORE UPDATE ON public.contact_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX contact_requests_to_user_idx ON public.contact_requests(to_user, status);
CREATE INDEX contact_requests_from_user_idx ON public.contact_requests(from_user, status);

-- search_profiles RPC: safe public projection only
CREATE OR REPLACE FUNCTION public.search_profiles(q text)
RETURNS TABLE (id uuid, display_name text, username text, avatar_url text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  needle text := lower(trim(coalesce(q, '')));
  phone_digits text := regexp_replace(coalesce(q,''), '\D', '', 'g');
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF length(needle) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.display_name, p.username, p.avatar_url
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE p.id <> caller
    AND (
      lower(p.username) = needle
      OR lower(p.username) LIKE needle || '%'
      OR lower(p.display_name) LIKE '%' || needle || '%'
      OR lower(u.email) = needle
      OR (length(phone_digits) >= 6 AND regexp_replace(coalesce(p.phone,''), '\D', '', 'g') = phone_digits)
    )
  ORDER BY
    (lower(p.username) = needle) DESC,
    (lower(u.email) = needle) DESC,
    p.display_name
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;

-- send_contact_request RPC
CREATE OR REPLACE FUNCTION public.send_contact_request(to_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  req_id uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF to_user_id IS NULL OR to_user_id = caller THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = to_user_id) THEN
    RAISE EXCEPTION 'recipient not found';
  END IF;
  -- already confirmed contact?
  IF EXISTS (
    SELECT 1 FROM public.contacts
    WHERE user_id = caller AND contact_user_id = to_user_id AND confirmed = true
  ) THEN
    RAISE EXCEPTION 'already in your contacts';
  END IF;

  -- if reverse request already accepted, just return it
  SELECT id INTO req_id FROM public.contact_requests
   WHERE from_user = caller AND to_user = to_user_id;
  IF req_id IS NOT NULL THEN
    RETURN req_id;
  END IF;

  -- if there is an inbound pending request, auto-accept it instead
  SELECT id INTO req_id FROM public.contact_requests
   WHERE from_user = to_user_id AND to_user = caller AND status = 'pending';
  IF req_id IS NOT NULL THEN
    PERFORM public.accept_contact_request(req_id);
    RETURN req_id;
  END IF;

  INSERT INTO public.contact_requests (from_user, to_user)
  VALUES (caller, to_user_id)
  RETURNING id INTO req_id;
  RETURN req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.send_contact_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_contact_request(uuid) TO authenticated;

-- accept_contact_request RPC: only the receiver can accept; inserts mutual contacts
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
  SELECT * INTO r FROM public.contact_requests WHERE id = request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.to_user <> caller THEN RAISE EXCEPTION 'not authorized'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'request not pending'; END IF;

  UPDATE public.contact_requests SET status = 'accepted' WHERE id = request_id;

  SELECT id, display_name, username, phone, avatar_url INTO p_from FROM public.profiles WHERE id = r.from_user;
  SELECT id, display_name, username, phone, avatar_url INTO p_to   FROM public.profiles WHERE id = r.to_user;

  -- add to_user's list (the caller's list)
  INSERT INTO public.contacts (user_id, contact_user_id, name, phone, username, confirmed)
  VALUES (r.to_user, r.from_user, coalesce(p_from.display_name, p_from.username, 'Contact'), p_from.phone, p_from.username, true)
  ON CONFLICT DO NOTHING;

  -- add from_user's list (the sender's list)
  INSERT INTO public.contacts (user_id, contact_user_id, name, phone, username, confirmed)
  VALUES (r.from_user, r.to_user, coalesce(p_to.display_name, p_to.username, 'Contact'), p_to.phone, p_to.username, true)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_contact_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_contact_request(uuid) TO authenticated;

-- decline_contact_request RPC: only the receiver
CREATE OR REPLACE FUNCTION public.decline_contact_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  r RECORD;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO r FROM public.contact_requests WHERE id = request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF r.to_user <> caller THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.contact_requests SET status = 'declined' WHERE id = request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_contact_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_contact_request(uuid) TO authenticated;

-- Helpful uniqueness on contacts so the insert above is idempotent
CREATE UNIQUE INDEX IF NOT EXISTS contacts_user_contact_unique
  ON public.contacts (user_id, contact_user_id)
  WHERE contact_user_id IS NOT NULL;