
CREATE OR REPLACE FUNCTION public.gen_wallet_uid()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v text;
BEGIN
  -- 16 digit numeric, no leading zero
  v := (1 + floor(random() * 9))::int::text;
  FOR i IN 1..15 LOOP
    v := v || floor(random() * 10)::int::text;
  END LOOP;
  RETURN v;
END;
$$;

CREATE TABLE public.domicile_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  wallet_uid text NOT NULL UNIQUE,
  currency text NOT NULL DEFAULT 'ZAR',
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.domicile_wallets TO authenticated;
GRANT ALL ON public.domicile_wallets TO service_role;

ALTER TABLE public.domicile_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallet owner read" ON public.domicile_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "wallet owner insert" ON public.domicile_wallets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallet owner update" ON public.domicile_wallets FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER touch_domicile_wallets BEFORE UPDATE ON public.domicile_wallets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- prevent UID changes after creation
CREATE OR REPLACE FUNCTION public.domicile_lock_uid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_uid IS DISTINCT FROM OLD.wallet_uid THEN
    RAISE EXCEPTION 'wallet_uid is immutable';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER domicile_lock BEFORE UPDATE ON public.domicile_wallets
  FOR EACH ROW EXECUTE FUNCTION public.domicile_lock_uid();

-- Atomic get-or-create
CREATE OR REPLACE FUNCTION public.get_or_create_domicile_wallet(preferred_currency text DEFAULT NULL)
RETURNS public.domicile_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  rec public.domicile_wallets;
  new_uid text;
  attempts int := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO rec FROM public.domicile_wallets WHERE user_id = caller;
  IF FOUND THEN
    IF preferred_currency IS NOT NULL AND preferred_currency <> rec.currency THEN
      UPDATE public.domicile_wallets SET currency = preferred_currency WHERE user_id = caller RETURNING * INTO rec;
    END IF;
    RETURN rec;
  END IF;
  LOOP
    attempts := attempts + 1;
    new_uid := public.gen_wallet_uid();
    BEGIN
      INSERT INTO public.domicile_wallets (user_id, wallet_uid, currency)
      VALUES (caller, new_uid, COALESCE(preferred_currency, 'ZAR'))
      RETURNING * INTO rec;
      RETURN rec;
    EXCEPTION WHEN unique_violation THEN
      IF attempts > 6 THEN RAISE; END IF;
    END;
  END LOOP;
END;
$$;
