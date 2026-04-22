-- ============================================================
-- 1. authorized_team_emails — bloquear writes via API
-- ============================================================
-- A tabela só tem policy de SELECT, mas como RLS está habilitada e nenhuma
-- policy permite INSERT/UPDATE/DELETE, qualquer write via API já é negado.
-- Para deixar isso explícito e à prova de futuras alterações, criamos
-- policies RESTRICTIVE de bloqueio total para clients (anon/authenticated).

-- Confirma RLS habilitada (caso ainda não esteja)
ALTER TABLE public.authorized_team_emails ENABLE ROW LEVEL SECURITY;

-- Bloqueio explícito de writes (RESTRICTIVE: precisa ser true em TODAS, e como always false → nega)
CREATE POLICY "Block all client inserts on authorized_team_emails"
ON public.authorized_team_emails
AS RESTRICTIVE
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block all client updates on authorized_team_emails"
ON public.authorized_team_emails
AS RESTRICTIVE
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block all client deletes on authorized_team_emails"
ON public.authorized_team_emails
AS RESTRICTIVE
FOR DELETE
TO anon, authenticated
USING (false);

-- ============================================================
-- 2. propostas bucket — INSERT scoped por owner
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users upload proposals" ON storage.objects;

CREATE POLICY "Owner can upload proposals"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'propostas'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
);

-- ============================================================
-- 3. inaug-checklist-photos & visita-tecnica-photos — INSERT scoped
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can upload inaug photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload visita tecnica photos" ON storage.objects;

CREATE POLICY "Owner can upload inaug photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'inaug-checklist-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
);

CREATE POLICY "Owner can upload visita photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'visita-tecnica-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
);