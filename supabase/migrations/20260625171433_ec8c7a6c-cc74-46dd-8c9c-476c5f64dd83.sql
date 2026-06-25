
-- Restrict listing on public buckets (files still served via direct public URL)
DROP POLICY IF EXISTS "Anyone can view inaug photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view visita tecnica photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users read proposals" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can list public photo buckets" ON storage.objects;

CREATE POLICY "Team can list inaug photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'inaug-checklist-photos' AND public.is_authorized_team(auth.uid()));

CREATE POLICY "Team can list visita photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'visita-tecnica-photos' AND public.is_authorized_team(auth.uid()));

CREATE POLICY "Team or owner can list proposals"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'propostas'
    AND ((storage.foldername(name))[1] = (auth.uid())::text OR public.is_authorized_team(auth.uid()))
  );

-- Restrict execution of SECURITY DEFINER helper to signed-in users only
REVOKE EXECUTE ON FUNCTION public.is_authorized_team(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_authorized_team(uuid) TO authenticated, service_role;
