
-- ============== DEBIT ORDERS ==============
CREATE TABLE public.debit_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  period text NOT NULL DEFAULT 'monthly',          -- weekly|monthly|quarterly|yearly
  category_slug text,
  account_id uuid,
  next_date date NOT NULL,
  remind_days_before integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.debit_orders TO authenticated;
GRANT ALL ON public.debit_orders TO service_role;

ALTER TABLE public.debit_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "debit_orders owner all"
ON public.debit_orders
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER debit_orders_touch
BEFORE UPDATE ON public.debit_orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.debit_orders;

-- ============== CHAT MESSAGE DELETE ==============
-- Senders may delete their own messages; recipients only read.
CREATE POLICY "msg sender delete"
ON public.messages
FOR DELETE TO authenticated
USING (auth.uid() = sender_id);

-- Ensure DELETE events fire with the old row payload for realtime subscribers.
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- ============== WEBRTC SIGNALING ==============
CREATE TABLE public.call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  from_user uuid NOT NULL,
  to_user uuid NOT NULL,
  kind text NOT NULL,                              -- offer|answer|ice|bye
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX call_signals_to_idx ON public.call_signals(to_user, created_at);
CREATE INDEX call_signals_call_idx ON public.call_signals(call_id);

GRANT SELECT, INSERT, DELETE ON public.call_signals TO authenticated;
GRANT ALL ON public.call_signals TO service_role;

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_signals party read"
ON public.call_signals FOR SELECT TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);

CREATE POLICY "call_signals sender insert"
ON public.call_signals FOR INSERT TO authenticated
WITH CHECK (auth.uid() = from_user);

CREATE POLICY "call_signals party delete"
ON public.call_signals FOR DELETE TO authenticated
USING (auth.uid() = from_user OR auth.uid() = to_user);

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
