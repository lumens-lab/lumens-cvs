-- Allow authenticated users to read public profile fields of any user
-- (display_name, username, avatar_url, cover_url). PII (phone, dob) and email
-- remain gated by get_contact_full_profile / contacts.

-- Revoke direct SELECT on PII columns for authenticated; keep safe columns readable.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, display_name, username, avatar_url, cover_url, created_at, updated_at)
  ON public.profiles TO authenticated;
GRANT UPDATE, INSERT, DELETE ON public.profiles TO authenticated;

-- Replace the owner-only SELECT policy with one that lets any authenticated
-- user read profile rows (column grants above restrict which fields they get).
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);