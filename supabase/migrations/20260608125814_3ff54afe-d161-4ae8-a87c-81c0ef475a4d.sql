-- Tighten e2ee_identities and e2ee_signed_prekeys: drop the open-read policies
-- and replace with self-only. Cross-user reads happen exclusively through the
-- SECURITY DEFINER `fetch_prekey_bundle` RPC, which bypasses RLS.
DROP POLICY IF EXISTS "e2ee_identities authenticated read" ON public.e2ee_identities;
DROP POLICY IF EXISTS "e2ee_identities read all" ON public.e2ee_identities;
DROP POLICY IF EXISTS "Authenticated can read identities" ON public.e2ee_identities;

DROP POLICY IF EXISTS "e2ee_signed_prekeys authenticated read" ON public.e2ee_signed_prekeys;
DROP POLICY IF EXISTS "e2ee_signed_prekeys read all" ON public.e2ee_signed_prekeys;
DROP POLICY IF EXISTS "Authenticated can read signed prekeys" ON public.e2ee_signed_prekeys;

-- Re-create self-only SELECT policies (idempotent)
DROP POLICY IF EXISTS "e2ee identities self read" ON public.e2ee_identities;
CREATE POLICY "e2ee identities self read" ON public.e2ee_identities
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "e2ee signed prekeys self read" ON public.e2ee_signed_prekeys;
CREATE POLICY "e2ee signed prekeys self read" ON public.e2ee_signed_prekeys
  FOR SELECT TO authenticated USING (user_id = auth.uid());