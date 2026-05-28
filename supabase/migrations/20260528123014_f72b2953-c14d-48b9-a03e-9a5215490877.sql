-- 1) push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  subscription jsonb NOT NULL,
  device text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX push_subscriptions_user_endpoint_idx
  ON public.push_subscriptions (user_id, (subscription->>'endpoint'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push owner all" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER push_subscriptions_touch
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Enable realtime for chat tables
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.contact_requests REPLICA IDENTITY FULL;
ALTER TABLE public.contacts REPLICA IDENTITY FULL;

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversations';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='contact_requests';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_requests';
  END IF;
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='contacts';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts';
  END IF;
END $$;

-- 3) list_contact_requests with profile names
CREATE OR REPLACE FUNCTION public.list_contact_requests()
RETURNS TABLE (
  id uuid,
  from_user uuid,
  to_user uuid,
  direction text,
  status text,
  display_name text,
  username text,
  avatar_url text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.from_user,
    r.to_user,
    CASE WHEN r.from_user = caller THEN 'sent' ELSE 'received' END AS direction,
    r.status,
    p.display_name,
    p.username,
    p.avatar_url,
    r.created_at
  FROM public.contact_requests r
  LEFT JOIN public.profiles p
    ON p.id = CASE WHEN r.from_user = caller THEN r.to_user ELSE r.from_user END
  WHERE r.status = 'pending'
    AND (r.from_user = caller OR r.to_user = caller)
  ORDER BY r.created_at DESC;
END;
$$;

-- 4) get_or_create_conversation between caller and another confirmed contact
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  conv_id uuid;
  a uuid;
  b uuid;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF other_user_id IS NULL OR other_user_id = caller THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;

  -- must be confirmed contacts both ways
  IF NOT EXISTS (
    SELECT 1 FROM public.contacts
    WHERE user_id = caller AND contact_user_id = other_user_id AND confirmed = true
  ) THEN
    RAISE EXCEPTION 'not a confirmed contact';
  END IF;

  -- canonical order
  IF caller < other_user_id THEN a := caller; b := other_user_id;
  ELSE a := other_user_id; b := caller; END IF;

  SELECT id INTO conv_id FROM public.conversations
   WHERE user_a = a AND user_b = b
   LIMIT 1;

  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (user_a, user_b, last_preview, last_at)
    VALUES (a, b, '', now())
    RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$$;