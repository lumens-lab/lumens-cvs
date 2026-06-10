
-- Add pin_hash to profiles so users keep the same PIN across devices.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pin_hash text;

-- Owner-only setter for PIN hash. Validates a sha256:<hex64> shape so the
-- table can never hold raw plaintext PINs.
CREATE OR REPLACE FUNCTION public.set_my_pin_hash(p_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_hash IS NOT NULL AND p_hash !~ '^sha256:[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid pin hash format';
  END IF;
  UPDATE public.profiles SET pin_hash = p_hash, updated_at = now() WHERE id = caller;
END;
$$;

-- Owner-only getter for PIN hash. Avoids broadening profile SELECT scope.
CREATE OR REPLACE FUNCTION public.get_my_pin_hash()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pin_hash FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.set_my_pin_hash(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_pin_hash() TO authenticated;
