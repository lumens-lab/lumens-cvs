DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

DROP POLICY IF EXISTS "Recipients update tick status" ON public.messages;
CREATE POLICY "Recipients update tick status"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS "chat-media: authenticated can read" ON storage.objects;
CREATE POLICY "chat-media: owner can read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

ALTER VIEW public.profiles_public SET (security_invoker = on);