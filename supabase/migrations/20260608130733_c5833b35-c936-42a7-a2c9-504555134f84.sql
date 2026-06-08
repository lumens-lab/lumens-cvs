-- One-time sanitization of any historical plaintext previews. Going forward,
-- the client-side senders only write neutral '💬 Message' / kind labels and
-- writes are funneled through touch_conversation_preview / touch_group_preview.
UPDATE public.conversations
   SET last_preview = '💬 Message'
 WHERE last_preview IS NOT NULL
   AND last_preview NOT IN ('💬 Message','📷 Photo','🎬 Video','🎙️ Voice note','💸 Payment','');

UPDATE public.groups
   SET last_preview = '💬 Message'
 WHERE last_preview IS NOT NULL
   AND last_preview NOT IN ('💬 Message','📷 Photo','🎬 Video','🎙️ Voice note','💸 Payment','');

-- Tighten calls: drop the over-broad UPDATE policy, prevent identity columns
-- from being mutated via a trigger, and re-create the policy scoped to
-- participants. The trigger blocks any UPDATE that tries to change caller/callee
-- or the calls's own id, so the worst either party can do is mutate
-- status/ended_at/duration_seconds for a call they participate in.
DROP POLICY IF EXISTS "calls party update" ON public.calls;

CREATE OR REPLACE FUNCTION public.calls_immutable_identity()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.caller_id IS DISTINCT FROM OLD.caller_id
     OR NEW.callee_id IS DISTINCT FROM OLD.callee_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
    RAISE EXCEPTION 'calls identity columns are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calls_identity_immutable ON public.calls;
CREATE TRIGGER calls_identity_immutable
  BEFORE UPDATE ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.calls_immutable_identity();

CREATE POLICY "calls party update" ON public.calls
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);