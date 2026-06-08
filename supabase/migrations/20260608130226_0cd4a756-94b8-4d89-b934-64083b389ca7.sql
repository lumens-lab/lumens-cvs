-- Drop the actual blanket-read policies that the previous migration missed
DROP POLICY IF EXISTS "Identities are readable by authenticated" ON public.e2ee_identities;
DROP POLICY IF EXISTS "Signed prekeys readable by authenticated" ON public.e2ee_signed_prekeys;

-- Drop the over-broad UPDATE on conversations. Preview/last_at are set by
-- sendChatMessage immediately after insert; that write was the only legitimate
-- use case and it relied on a too-permissive policy that also let either party
-- spoof the other's preview. With the policy gone, direct REST UPDATEs fail;
-- we replace the legitimate write with a SECURITY DEFINER helper used by the
-- client that only touches last_preview/last_at and only for the caller's
-- conversation.
DROP POLICY IF EXISTS "conv participants update" ON public.conversations;

CREATE OR REPLACE FUNCTION public.touch_conversation_preview(
  p_conversation_id uuid,
  p_preview text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_preview IS NULL OR length(p_preview) > 200 THEN
    RAISE EXCEPTION 'invalid preview';
  END IF;
  UPDATE public.conversations
     SET last_preview = p_preview,
         last_at = now()
   WHERE id = p_conversation_id
     AND (user_a = caller OR user_b = caller);
  IF NOT FOUND THEN RAISE EXCEPTION 'not a participant'; END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_conversation_preview(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_conversation_preview(uuid, text) TO authenticated;

-- Same for groups: prevent any group member from arbitrarily updating last_preview
DROP POLICY IF EXISTS "group member update last preview" ON public.groups;
DROP POLICY IF EXISTS "groups member update" ON public.groups;

CREATE OR REPLACE FUNCTION public.touch_group_preview(
  p_group_id uuid,
  p_preview text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_preview IS NULL OR length(p_preview) > 200 THEN
    RAISE EXCEPTION 'invalid preview';
  END IF;
  IF NOT public.is_group_member(p_group_id, caller) THEN
    RAISE EXCEPTION 'not a group member';
  END IF;
  UPDATE public.groups
     SET last_preview = p_preview,
         last_at = now(),
         updated_at = now()
   WHERE id = p_group_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.touch_group_preview(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_group_preview(uuid, text) TO authenticated;