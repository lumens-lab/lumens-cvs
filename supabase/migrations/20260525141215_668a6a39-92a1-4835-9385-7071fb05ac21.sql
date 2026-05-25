-- 1) Profiles: remove broad authenticated read; keep self-only read
DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;

-- 2) Cards: prevent user_id reassignment on update
DROP POLICY IF EXISTS "cards owner all" ON public.cards;

CREATE POLICY "cards owner select" ON public.cards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "cards owner insert" ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cards owner update" ON public.cards
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cards owner delete" ON public.cards
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Trigger guard: forbid changing user_id on existing rows
CREATE OR REPLACE FUNCTION public.cards_prevent_owner_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'cards.user_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cards_prevent_owner_change ON public.cards;
CREATE TRIGGER cards_prevent_owner_change
  BEFORE UPDATE ON public.cards
  FOR EACH ROW
  EXECUTE FUNCTION public.cards_prevent_owner_change();