DROP POLICY IF EXISTS "Avatar images are publicly readable" ON storage.objects;

CREATE POLICY "Avatar images are readable by signed-in users"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');