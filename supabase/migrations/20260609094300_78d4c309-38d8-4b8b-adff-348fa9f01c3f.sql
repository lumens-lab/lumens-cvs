-- Allow any signed-in user to read the public profile view (avatar, display name, username, cover).
-- The view excludes phone, dob and email so PII never leaks.
ALTER VIEW public.profiles_public SET (security_invoker = off);
GRANT SELECT ON public.profiles_public TO authenticated;

-- Secure RPC that returns full profile (incl. phone, dob) ONLY when caller is a confirmed contact.
CREATE OR REPLACE FUNCTION public.get_contact_full_profile(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  avatar_url text,
  cover_url text,
  phone text,
  dob date,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_contact boolean;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF caller = p_user_id THEN
    RETURN QUERY
      SELECT p.id, p.display_name, p.username, p.avatar_url, p.cover_url,
             p.phone, p.dob, u.email::text
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = caller;
    RETURN;
  END IF;
  SELECT EXISTS (
    SELECT 1 FROM public.contacts
    WHERE user_id = caller AND contact_user_id = p_user_id AND confirmed = true
  ) INTO is_contact;
  IF NOT is_contact THEN
    -- Return only public columns when not a contact
    RETURN QUERY
      SELECT p.id, p.display_name, p.username, p.avatar_url, p.cover_url,
             NULL::text, NULL::date, NULL::text
      FROM public.profiles p WHERE p.id = p_user_id;
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, p.display_name, p.username, p.avatar_url, p.cover_url,
           p.phone, p.dob, u.email::text
    FROM public.profiles p
    LEFT JOIN auth.users u ON u.id = p.id
    WHERE p.id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_contact_full_profile(uuid) TO authenticated;