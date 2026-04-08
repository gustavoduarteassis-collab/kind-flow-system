
-- Restrict authorized_team_emails SELECT to team only
DROP POLICY IF EXISTS "All authenticated can view" ON public.authorized_team_emails;
CREATE POLICY "Only team can view authorized emails"
ON public.authorized_team_emails FOR SELECT TO authenticated
USING (is_authorized_team(auth.uid()));

-- Restrict fornecedores_prospeccao SELECT to team only
DROP POLICY IF EXISTS "All authenticated view fornecedores_prospeccao" ON public.fornecedores_prospeccao;
CREATE POLICY "Authorized team can view fornecedores_prospeccao"
ON public.fornecedores_prospeccao FOR SELECT TO authenticated
USING (is_authorized_team(auth.uid()));

-- Fix storage DELETE policies with ownership checks
DROP POLICY IF EXISTS "Users can delete diary photos" ON storage.objects;
CREATE POLICY "Users can delete own diary photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'diary-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete inaug photos" ON storage.objects;
CREATE POLICY "Users can delete own inaug photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'inaug-checklist-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete visita photos" ON storage.objects;
CREATE POLICY "Users can delete own visita photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'visita-tecnica-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Make diary-photos bucket private
UPDATE storage.buckets SET public = false WHERE id = 'diary-photos';
