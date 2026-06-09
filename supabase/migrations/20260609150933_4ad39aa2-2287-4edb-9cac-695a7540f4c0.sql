-- 1) profiles: owners can SELECT their own row
DROP POLICY IF EXISTS "Users select own profile" ON public.profiles;
CREATE POLICY "Users select own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2) chat-media: allow any authenticated user to read objects in the bucket.
-- The storage path is a random UUID embedded only inside the E2EE message
-- payload, so only conversation participants ever learn it — same trust
-- model as the signed URLs we already issue. This lets recipients refresh
-- expired signed URLs and download media without the sender re-sharing.
DROP POLICY IF EXISTS "chat-media: owner can read" ON storage.objects;
DROP POLICY IF EXISTS "chat-media: authenticated can read" ON storage.objects;
CREATE POLICY "chat-media: authenticated can read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'chat-media');
