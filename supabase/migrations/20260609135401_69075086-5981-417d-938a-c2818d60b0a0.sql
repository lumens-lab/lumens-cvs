-- Per-conversation disappearing-messages TTL (null = off).
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS disappearing_seconds integer;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_disappearing_seconds_chk
  CHECK (disappearing_seconds IS NULL OR disappearing_seconds IN (86400, 604800, 2592000));

-- Per-message expiry timestamp (null = never).
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS expires_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON public.messages (expires_at) WHERE expires_at IS NOT NULL;

-- Trigger: stamp expires_at at insert based on conversation's disappearing_seconds.
CREATE OR REPLACE FUNCTION public.messages_set_expiry()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  secs integer;
BEGIN
  IF NEW.conversation_id IS NULL OR NEW.expires_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT disappearing_seconds INTO secs FROM public.conversations WHERE id = NEW.conversation_id;
  IF secs IS NOT NULL AND secs > 0 THEN
    NEW.expires_at := COALESCE(NEW.created_at, now()) + make_interval(secs => secs);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_messages_set_expiry ON public.messages;
CREATE TRIGGER trg_messages_set_expiry BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.messages_set_expiry();

-- RPC: set disappearing timer (only conversation participants).
CREATE OR REPLACE FUNCTION public.set_disappearing(p_conversation_id uuid, p_seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_seconds IS NOT NULL AND p_seconds NOT IN (86400, 604800, 2592000) THEN
    RAISE EXCEPTION 'invalid disappearing duration';
  END IF;
  UPDATE public.conversations
     SET disappearing_seconds = p_seconds
   WHERE id = p_conversation_id
     AND (user_a = caller OR user_b = caller);
  IF NOT FOUND THEN RAISE EXCEPTION 'not a participant'; END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.set_disappearing(uuid, integer) TO authenticated;

-- pg_cron job: delete expired messages every minute.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'lumens-purge-expired-messages') THEN
    PERFORM cron.unschedule('lumens-purge-expired-messages');
  END IF;
END $$;

SELECT cron.schedule(
  'lumens-purge-expired-messages',
  '* * * * *',
  $cron$ DELETE FROM public.messages WHERE expires_at IS NOT NULL AND expires_at < now(); $cron$
);