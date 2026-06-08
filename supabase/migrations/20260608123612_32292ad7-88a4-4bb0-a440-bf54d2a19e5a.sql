
-- ============ IDENTITIES ============
CREATE TABLE public.e2ee_identities (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  registration_id integer NOT NULL,
  identity_key text NOT NULL,           -- base64 public key
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.e2ee_identities TO authenticated;
GRANT ALL ON public.e2ee_identities TO service_role;
ALTER TABLE public.e2ee_identities ENABLE ROW LEVEL SECURITY;
-- Any authenticated user can read identities (needed to encrypt to any peer)
CREATE POLICY "Identities are readable by authenticated"
  ON public.e2ee_identities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage their own identity"
  ON public.e2ee_identities FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update their own identity"
  ON public.e2ee_identities FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ SIGNED PREKEYS ============
CREATE TABLE public.e2ee_signed_prekeys (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  public_key text NOT NULL,
  signature text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key_id)
);
GRANT SELECT, INSERT, DELETE ON public.e2ee_signed_prekeys TO authenticated;
GRANT ALL ON public.e2ee_signed_prekeys TO service_role;
ALTER TABLE public.e2ee_signed_prekeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed prekeys readable by authenticated"
  ON public.e2ee_signed_prekeys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users manage their own signed prekeys"
  ON public.e2ee_signed_prekeys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete their own signed prekeys"
  ON public.e2ee_signed_prekeys FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ ONE-TIME PREKEYS ============
CREATE TABLE public.e2ee_prekeys (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_id integer NOT NULL,
  public_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key_id)
);
GRANT SELECT, INSERT, DELETE ON public.e2ee_prekeys TO authenticated;
GRANT ALL ON public.e2ee_prekeys TO service_role;
ALTER TABLE public.e2ee_prekeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own prekey count"
  ON public.e2ee_prekeys FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert their own prekeys"
  ON public.e2ee_prekeys FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete their own prekeys"
  ON public.e2ee_prekeys FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ PUBLISH BUNDLE ============
-- Upload (or rotate) identity + signed prekey + a batch of one-time prekeys.
CREATE OR REPLACE FUNCTION public.publish_prekey_bundle(
  p_registration_id integer,
  p_identity_key text,
  p_signed_prekey_id integer,
  p_signed_prekey_public text,
  p_signed_prekey_signature text,
  p_prekey_ids integer[],
  p_prekey_publics text[]
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  i int;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_prekey_ids IS NULL OR p_prekey_publics IS NULL OR array_length(p_prekey_ids, 1) <> array_length(p_prekey_publics, 1) THEN
    RAISE EXCEPTION 'prekey arrays must match';
  END IF;

  INSERT INTO public.e2ee_identities (user_id, registration_id, identity_key)
  VALUES (caller, p_registration_id, p_identity_key)
  ON CONFLICT (user_id) DO UPDATE
    SET registration_id = EXCLUDED.registration_id,
        identity_key = EXCLUDED.identity_key,
        updated_at = now();

  INSERT INTO public.e2ee_signed_prekeys (user_id, key_id, public_key, signature)
  VALUES (caller, p_signed_prekey_id, p_signed_prekey_public, p_signed_prekey_signature)
  ON CONFLICT (user_id, key_id) DO UPDATE
    SET public_key = EXCLUDED.public_key,
        signature = EXCLUDED.signature;

  IF array_length(p_prekey_ids, 1) IS NOT NULL THEN
    FOR i IN 1..array_length(p_prekey_ids, 1) LOOP
      INSERT INTO public.e2ee_prekeys (user_id, key_id, public_key)
      VALUES (caller, p_prekey_ids[i], p_prekey_publics[i])
      ON CONFLICT (user_id, key_id) DO NOTHING;
    END LOOP;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.publish_prekey_bundle(integer, text, integer, text, text, integer[], text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_prekey_bundle(integer, text, integer, text, text, integer[], text[]) TO authenticated;

-- ============ FETCH BUNDLE (consume one prekey atomically) ============
CREATE OR REPLACE FUNCTION public.fetch_prekey_bundle(p_user_id uuid)
 RETURNS TABLE (
   registration_id integer,
   identity_key text,
   signed_prekey_id integer,
   signed_prekey_public text,
   signed_prekey_signature text,
   prekey_id integer,
   prekey_public text
 )
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller uuid := auth.uid();
  v_ident public.e2ee_identities;
  v_sp public.e2ee_signed_prekeys;
  v_pk_id integer;
  v_pk_pub text;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO v_ident FROM public.e2ee_identities WHERE user_id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'no identity for user'; END IF;
  SELECT * INTO v_sp FROM public.e2ee_signed_prekeys
    WHERE user_id = p_user_id ORDER BY key_id DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'no signed prekey for user'; END IF;

  -- Consume one-time prekey if available (atomic)
  DELETE FROM public.e2ee_prekeys
    WHERE (user_id, key_id) = (
      SELECT user_id, key_id FROM public.e2ee_prekeys
       WHERE user_id = p_user_id ORDER BY key_id ASC LIMIT 1
    )
    RETURNING key_id, public_key INTO v_pk_id, v_pk_pub;

  RETURN QUERY SELECT
    v_ident.registration_id,
    v_ident.identity_key,
    v_sp.key_id,
    v_sp.public_key,
    v_sp.signature,
    v_pk_id,
    v_pk_pub;
END;
$$;
REVOKE ALL ON FUNCTION public.fetch_prekey_bundle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fetch_prekey_bundle(uuid) TO authenticated;

-- ============ COUNT MY UNUSED PREKEYS (for replenishment) ============
CREATE OR REPLACE FUNCTION public.my_prekey_count()
 RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.e2ee_prekeys WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.my_prekey_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_prekey_count() TO authenticated;
