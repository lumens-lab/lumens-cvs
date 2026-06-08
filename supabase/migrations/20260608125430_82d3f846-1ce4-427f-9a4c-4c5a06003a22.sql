-- 1) Append-only audit table
CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigserial PRIMARY KEY,
  ts timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  kind text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash text NOT NULL,
  hash text NOT NULL
);

GRANT SELECT ON public.audit_events TO authenticated;
GRANT ALL ON public.audit_events TO service_role;
-- Intentionally NO insert/update/delete grants to authenticated: only
-- SECURITY DEFINER server functions may write, and rows are immutable.

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

-- Owners can read their own audit trail
DROP POLICY IF EXISTS "audit own read" ON public.audit_events;
CREATE POLICY "audit own read" ON public.audit_events
  FOR SELECT TO authenticated
  USING (actor_id = auth.uid());

-- 2) Append-only enforcement at the SQL level (defence in depth)
CREATE OR REPLACE FUNCTION public.audit_events_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_no_update ON public.audit_events;
CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_block_mutation();

DROP TRIGGER IF EXISTS audit_events_no_delete ON public.audit_events;
CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.audit_events_block_mutation();

-- 3) Core append helper. SHA-256 chain: hash = sha256(prev_hash || ts || actor || kind || meta).
--    Serialised under a single advisory lock so concurrent inserts cannot fork the chain.
CREATE OR REPLACE FUNCTION public.audit_log(p_kind text, p_meta jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  prev text;
  now_ts timestamptz := now();
  payload text;
  new_hash text;
BEGIN
  IF p_kind IS NULL OR length(p_kind) = 0 OR length(p_kind) > 64 THEN
    RAISE EXCEPTION 'invalid audit kind';
  END IF;

  -- Advisory lock keyed to the audit chain
  PERFORM pg_advisory_xact_lock(hashtext('public.audit_events.chain'));

  SELECT hash INTO prev FROM public.audit_events ORDER BY id DESC LIMIT 1;
  IF prev IS NULL THEN
    prev := repeat('0', 64); -- genesis
  END IF;

  payload := prev
    || '|' || extract(epoch from now_ts)::text
    || '|' || coalesce(caller::text, 'anon')
    || '|' || p_kind
    || '|' || coalesce(p_meta::text, '{}');

  new_hash := encode(digest(payload, 'sha256'), 'hex');

  INSERT INTO public.audit_events (ts, actor_id, kind, meta, prev_hash, hash)
  VALUES (now_ts, caller, p_kind, coalesce(p_meta, '{}'::jsonb), prev, new_hash);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_log(text, jsonb) FROM PUBLIC, anon, authenticated;
-- Internal only — called from other SECURITY DEFINER functions

-- 4) Client-callable message audit (metadata only — no plaintext, no ciphertext body)
CREATE OR REPLACE FUNCTION public.audit_log_message(
  p_event text,           -- 'encrypt' | 'decrypt'
  p_scope text,           -- 'dm' | 'group'
  p_envelope text,        -- 'signal' | 'groupfan' | 'legacy'
  p_peer_id uuid,         -- DM peer (nullable for groups)
  p_group_id uuid,        -- group id (nullable for DMs)
  p_message_id uuid,      -- messages.id (nullable for outbound pre-insert)
  p_ct_len integer,       -- ciphertext byte length
  p_success boolean
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_event NOT IN ('encrypt', 'decrypt') THEN RAISE EXCEPTION 'invalid event'; END IF;
  IF p_scope NOT IN ('dm', 'group') THEN RAISE EXCEPTION 'invalid scope'; END IF;
  IF p_envelope NOT IN ('signal', 'groupfan', 'legacy') THEN RAISE EXCEPTION 'invalid envelope'; END IF;
  IF p_ct_len IS NULL OR p_ct_len < 0 OR p_ct_len > 10000000 THEN RAISE EXCEPTION 'invalid ct_len'; END IF;

  PERFORM public.audit_log(
    'message.' || p_event,
    jsonb_build_object(
      'scope', p_scope,
      'envelope', p_envelope,
      'peer_id', p_peer_id,
      'group_id', p_group_id,
      'message_id', p_message_id,
      'ct_len', p_ct_len,
      'success', coalesce(p_success, true)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_log_message(text, text, text, uuid, uuid, uuid, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_message(text, text, text, uuid, uuid, uuid, integer, boolean) TO authenticated;

-- 5) wallet_deposit: keep behaviour, add an audit row on success
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

  PERFORM public.audit_log(
    'wallet.deposit',
    jsonb_build_object(
      'wallet_uid', rec.wallet_uid,
      'amount', p_amount,
      'currency', rec.currency,
      'new_balance', rec.balance
    )
  );

  RETURN rec;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.wallet_deposit(numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wallet_deposit(numeric) TO authenticated;

-- 6) Chain verification helper (read-only). Anyone signed-in may verify.
CREATE OR REPLACE FUNCTION public.audit_verify_chain(p_limit integer DEFAULT 1000)
RETURNS TABLE(checked bigint, broken_at bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  prev text := repeat('0', 64);
  computed text;
  n bigint := 0;
  broken bigint := NULL;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_limit IS NULL OR p_limit <= 0 OR p_limit > 100000 THEN p_limit := 1000; END IF;

  FOR r IN
    SELECT id, ts, actor_id, kind, meta, prev_hash, hash
      FROM public.audit_events ORDER BY id ASC LIMIT p_limit
  LOOP
    n := n + 1;
    computed := encode(digest(
      prev
        || '|' || extract(epoch from r.ts)::text
        || '|' || coalesce(r.actor_id::text, 'anon')
        || '|' || r.kind
        || '|' || coalesce(r.meta::text, '{}'),
      'sha256'), 'hex');
    IF r.prev_hash <> prev OR r.hash <> computed THEN
      broken := r.id;
      EXIT;
    END IF;
    prev := r.hash;
  END LOOP;

  RETURN QUERY SELECT n, broken;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.audit_verify_chain(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_verify_chain(integer) TO authenticated;

-- Ensure pgcrypto is available for digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;