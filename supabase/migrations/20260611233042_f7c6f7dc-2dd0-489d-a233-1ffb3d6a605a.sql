
CREATE TABLE public.user_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  income_cats JSONB NOT NULL DEFAULT '[]'::jsonb,
  expense_cats JSONB NOT NULL DEFAULT '[]'::jsonb,
  budgets JSONB NOT NULL DEFAULT '{}'::jsonb,
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_state TO authenticated;
GRANT ALL ON public.user_state TO service_role;

ALTER TABLE public.user_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_state owner read"
  ON public.user_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_state owner insert"
  ON public.user_state FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_state owner update"
  ON public.user_state FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_state owner delete"
  ON public.user_state FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_state_touch
  BEFORE UPDATE ON public.user_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
