-- Sender writes to chat-media/{auth.uid()}/...
CREATE POLICY "chat-media: sender uploads to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "chat-media: sender updates own"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "chat-media: sender deletes own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Any signed-in user may read (path is opaque + encrypted inside the chat message).
CREATE POLICY "chat-media: authenticated can read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-media');