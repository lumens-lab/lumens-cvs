-- Lock down profiles SELECT to safe columns only; phone/dob never leak via PostgREST.
-- Other users only see public fields. Owner reads full row directly (RLS still permits).
-- Confirmed contacts get phone/dob via existing security-definer get_contact_full_profile().

REVOKE SELECT ON public.profiles FROM authenticated, anon;
GRANT SELECT (id, display_name, username, avatar_url, cover_url, currency, language, created_at, updated_at)
  ON public.profiles TO authenticated;
-- Owner-only columns (phone, dob) — granted only to service_role; readable to owners via SECURITY DEFINER fn.
GRANT ALL ON public.profiles TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- Owner needs to read their own phone/dob from the client. Add a SECURITY DEFINER helper.
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS TABLE (
  id uuid, display_name text, username text, avatar_url text, cover_url text,
  currency text, language text, phone text, dob date,
  created_at timestamptz, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, p.display_name, p.username, p.avatar_url, p.cover_url,
         p.currency, p.language, p.phone, p.dob, p.created_at, p.updated_at
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- Search performance: trigram index on username + display_name; phone exact lookup.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON public.profiles USING gin (lower(username) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON public.profiles USING gin (lower(display_name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone) WHERE phone IS NOT NULL;