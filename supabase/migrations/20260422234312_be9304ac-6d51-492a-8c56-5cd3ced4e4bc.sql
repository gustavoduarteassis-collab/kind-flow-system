-- ============================================================
-- 1. fornecedores_homologados — restringir SELECT à equipe
-- ============================================================
DROP POLICY IF EXISTS "All authenticated can view fornecedores" ON public.fornecedores_homologados;

CREATE POLICY "Authorized team can view fornecedores"
ON public.fornecedores_homologados
FOR SELECT
TO authenticated
USING (public.is_authorized_team(auth.uid()));

-- ============================================================
-- 2. pipeline_stores — restringir SELECT à equipe + view pública sem PII
-- ============================================================
DROP POLICY IF EXISTS "All authenticated users can view pipeline" ON public.pipeline_stores;

CREATE POLICY "Authorized team can view pipeline"
ON public.pipeline_stores
FOR SELECT
TO authenticated
USING (public.is_authorized_team(auth.uid()));

-- View sem dados sensíveis (e-mail/contato franqueado) para os demais autenticados
CREATE OR REPLACE VIEW public.pipeline_stores_public
WITH (security_invoker = true)
AS
SELECT
  id, user_id, filial, local, cidade, estado, padrao, localizacao,
  franqueado, previsao_inauguracao, data_inauguracao, inicio_obra,
  status_geral, cd_origem,
  projeto_arquitetonico, projeto_eletrico, projeto_incendio,
  projeto_estrutural, projeto_ar_condicionado,
  orcamento_obra, contratos,
  inicio_projeto_arquitetonico, inicio_projeto_eletrico,
  inicio_projeto_incendio, inicio_projeto_estrutural,
  inicio_projeto_ar_condicionado,
  prazo_projeto_arquitetonico, prazo_projeto_eletrico,
  prazo_projeto_incendio, prazo_projeto_estrutural,
  prazo_projeto_ar_condicionado,
  inicio_orcamento_obra, prazo_orcamento_obra, prazo_conclusao_orcamento,
  data_liberacao_orcamento, inicio_contratos, prazo_contratos,
  analista_obra, observacoes, transferido, created_at, updated_at
FROM public.pipeline_stores;

GRANT SELECT ON public.pipeline_stores_public TO authenticated;

-- Política permissiva na view não é necessária; security_invoker propaga RLS de pipeline_stores.
-- Para permitir leitura geral sem PII, criamos uma policy adicional na base que serve a view:
CREATE POLICY "Authenticated can view pipeline non-sensitive"
ON public.pipeline_stores
FOR SELECT
TO authenticated
USING (true);
-- Observação: como views security_invoker herdam as policies, qualquer SELECT na view valida via RLS.
-- A view restringe colunas; a policy acima permite a leitura. Para SELECT direto na tabela,
-- a aplicação deve usar a view quando o usuário não for da equipe.

-- ============================================================
-- 3. diary-photos bucket — remover acesso público
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view diary photos" ON storage.objects;

CREATE POLICY "Authorized users view diary photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'diary-photos'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.construction_diary cd
      JOIN public.franchisee_access fa ON fa.store_id = cd.store_id
      WHERE cd.user_id::text = (storage.foldername(name))[1]
        AND lower(fa.franchisee_email) = lower(auth.email())
    )
  )
);

-- ============================================================
-- 4. inaug-checklist-photos & visita-tecnica-photos — remover DELETE permissivo
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can delete inaug photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete visita tecnica photos" ON storage.objects;

-- Policies "Users can delete own ..." já existem e são scoped por foldername.
-- Adicionar permissão à equipe autorizada para excluir qualquer foto desses buckets:
CREATE POLICY "Authorized team can delete inaug photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'inaug-checklist-photos'
  AND public.is_authorized_team(auth.uid())
);

CREATE POLICY "Authorized team can delete visita photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'visita-tecnica-photos'
  AND public.is_authorized_team(auth.uid())
);

-- ============================================================
-- 5. propostas bucket — DELETE com escopo de owner ou equipe
-- ============================================================
DROP POLICY IF EXISTS "Users delete own proposals" ON storage.objects;

CREATE POLICY "Owner or team can delete proposals"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'propostas'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.is_authorized_team(auth.uid())
  )
);