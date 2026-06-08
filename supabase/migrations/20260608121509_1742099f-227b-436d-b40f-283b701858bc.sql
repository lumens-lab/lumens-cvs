
CREATE OR REPLACE FUNCTION public.rename_group(p_group_id uuid, p_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 OR length(trim(p_name)) > 80 THEN
    RAISE EXCEPTION 'name must be 1-80 chars';
  END IF;
  IF NOT public.is_group_admin(p_group_id, caller) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.groups SET name = trim(p_name), updated_at = now() WHERE id = p_group_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.rename_group(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rename_group(uuid, text) TO authenticated;
