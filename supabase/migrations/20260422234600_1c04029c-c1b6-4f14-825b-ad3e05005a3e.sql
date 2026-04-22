-- diary-photos: adicionar UPDATE policy scoped por owner
CREATE POLICY "Owner can update diary photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'diary-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'diary-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
);