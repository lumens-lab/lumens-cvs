-- 1) Profiles: remove blanket authenticated read access
DROP POLICY IF EXISTS "Authenticated can read public profile fields" ON public.profiles;

-- 2) Wallet integrity: drop client UPDATE policy and provide a server-validated deposit RPC
DROP POLICY IF EXISTS "wallet owner update" ON public.domicile_wallets;

CREATE OR REPLACE FUNCTION public.wallet_deposit(p_amount numeric)
RETURNS public.domicile_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  rec public.domicile_wallets;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 1000000 THEN
    RAISE EXCEPTION 'invalid deposit amount';
  END IF;
  UPDATE public.domicile_wallets
     SET balance = COALESCE(balance, 0) + p_amount,
         updated_at = now()
   WHERE user_id = caller
   RETURNING * INTO rec;
  IF NOT FOUND THEN RAISE EXCEPTION 'wallet missing'; END IF;
  RETURN rec;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_deposit(numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.wallet_deposit(numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(numeric) TO authenticated;

-- 3) Lock search_path on gen_wallet_uid (was the only function without it)
CREATE OR REPLACE FUNCTION public.gen_wallet_uid()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v text;
BEGIN
  v := (1 + floor(random() * 9))::int::text;
  FOR i IN 1..15 LOOP
    v := v || floor(random() * 10)::int::text;
  END LOOP;
  RETURN v;
END;
$$;