
-- CALLS
DROP POLICY IF EXISTS "calls party write" ON public.calls;

CREATE POLICY "calls caller insert"
  ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "calls party update"
  ON public.calls FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "calls caller delete"
  ON public.calls FOR DELETE TO authenticated
  USING (auth.uid() = caller_id);

-- CONVERSATIONS
DROP POLICY IF EXISTS "conv participants write" ON public.conversations;

CREATE POLICY "conv initiator insert"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_a);

CREATE POLICY "conv participants update"
  ON public.conversations FOR UPDATE TO authenticated
  USING (auth.uid() = user_a OR auth.uid() = user_b)
  WITH CHECK (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "conv initiator delete"
  ON public.conversations FOR DELETE TO authenticated
  USING (auth.uid() = user_a);

-- PROFILES (explicit self-only delete)
CREATE POLICY "Users delete own profile"
  ON public.profiles FOR DELETE TO authenticated
  USING (auth.uid() = id);
