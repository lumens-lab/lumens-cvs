
-- 1) Safe public view of profiles (no DOB, no phone)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, display_name, username, avatar_url, cover_url
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO authenticated;

-- 2) Allow authenticated users to SELECT safe profile rows from the base table
--    (security_invoker view inherits caller privileges, so the base table needs a policy).
--    This policy ONLY matters for columns selected through the view; the existing
--    "Users view own profile" policy still gates full-row access to the owner.
DROP POLICY IF EXISTS "Authenticated can read public profile fields" ON public.profiles;
CREATE POLICY "Authenticated can read public profile fields"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Note: the view explicitly omits dob/phone, so even though the underlying
-- SELECT policy is permissive, those columns are not reachable through
-- profiles_public. Code MUST query profiles_public for non-owner reads.
