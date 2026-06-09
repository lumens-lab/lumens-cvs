CREATE OR REPLACE FUNCTION public.send_contact_request(to_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  req_id uuid;
  recent_count integer;
  decline_count integer;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF to_user_id IS NULL OR to_user_id = caller THEN
    RAISE EXCEPTION 'invalid recipient';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = to_user_id) THEN
    RAISE EXCEPTION 'recipient not found';
  END IF;

  -- Rate limit: 20 requests per hour per caller.
  SELECT count(*) INTO recent_count FROM public.contact_requests
    WHERE from_user = caller AND created_at > now() - interval '1 hour';
  IF recent_count >= 20 THEN
    RAISE EXCEPTION 'rate_limited: too many requests, try again later';
  END IF;

  -- Soft block: 3+ declines from this recipient in 7d.
  SELECT count(*) INTO decline_count FROM public.contact_requests
    WHERE from_user = caller AND to_user = to_user_id
      AND status = 'declined' AND created_at > now() - interval '7 days';
  IF decline_count >= 3 THEN
    RAISE EXCEPTION 'blocked: user is not accepting requests from you';
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
$function$;