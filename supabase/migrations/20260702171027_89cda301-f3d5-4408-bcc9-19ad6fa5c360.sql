
-- ============================================================
-- Bloco 1 + Bloco 2: novas colunas aditivas em public.stores
-- ============================================================
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS razao_social text,
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS cd_origem text,
  ADD COLUMN IF NOT EXISTS tipo_localizacao text,
  ADD COLUMN IF NOT EXISTS area_m2 numeric,
  ADD COLUMN IF NOT EXISTS num_pisos integer,
  ADD COLUMN IF NOT EXISTS horario_funcionamento text,
  ADD COLUMN IF NOT EXISTS email_operacional text,
  ADD COLUMN IF NOT EXISTS email_financeiro text,
  ADD COLUMN IF NOT EXISTS telefone_franqueado text,
  ADD COLUMN IF NOT EXISTS gerente_regional text,
  ADD COLUMN IF NOT EXISTS analista_arquitetura text,
  ADD COLUMN IF NOT EXISTS implantadora text,
  ADD COLUMN IF NOT EXISTS grade_produtos text,
  ADD COLUMN IF NOT EXISTS previsao_faturamento date,
  ADD COLUMN IF NOT EXISTS status_faturamento text,
  ADD COLUMN IF NOT EXISTS status_geral_manual text,
  -- pares prevista/real
  ADD COLUMN IF NOT EXISTS contrato_locacao_prev date,
  ADD COLUMN IF NOT EXISTS contrato_locacao_real date,
  ADD COLUMN IF NOT EXISTS chaves_prev date,
  ADD COLUMN IF NOT EXISTS chaves_real date,
  ADD COLUMN IF NOT EXISTS faturamento_mercadoria_prev date,
  ADD COLUMN IF NOT EXISTS faturamento_mercadoria_real date,
  ADD COLUMN IF NOT EXISTS produtos_chegada_prev date,
  ADD COLUMN IF NOT EXISTS produtos_chegada_real date,
  ADD COLUMN IF NOT EXISTS visita_tecnica_realizada date;

-- ============================================================
-- Bloco 4: tabela stage_comments (comentários por etapa)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.stage_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  texto text NOT NULL,
  autor_nome text,
  autor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_stage_comments_store_stage
  ON public.stage_comments (store_id, stage_key)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stage_comments TO authenticated;
GRANT ALL ON public.stage_comments TO service_role;

ALTER TABLE public.stage_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stage_comments_select" ON public.stage_comments;
CREATE POLICY "stage_comments_select" ON public.stage_comments
  FOR SELECT TO authenticated
  USING (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "stage_comments_insert" ON public.stage_comments;
CREATE POLICY "stage_comments_insert" ON public.stage_comments
  FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "stage_comments_update" ON public.stage_comments;
CREATE POLICY "stage_comments_update" ON public.stage_comments
  FOR UPDATE TO authenticated
  USING (public.is_authorized_team(auth.uid()))
  WITH CHECK (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "stage_comments_delete" ON public.stage_comments;
CREATE POLICY "stage_comments_delete" ON public.stage_comments
  FOR DELETE TO authenticated
  USING (public.is_authorized_team(auth.uid()));

-- ============================================================
-- Bloco 7: tabela pendencias_pos_inauguracao
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pendencias_pos_inauguracao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  responsavel text,
  prazo date,
  status text NOT NULL DEFAULT 'Pendente',
  criado_por text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pendencias_store
  ON public.pendencias_pos_inauguracao (store_id)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias_pos_inauguracao TO authenticated;
GRANT ALL ON public.pendencias_pos_inauguracao TO service_role;

ALTER TABLE public.pendencias_pos_inauguracao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pendencias_select" ON public.pendencias_pos_inauguracao;
CREATE POLICY "pendencias_select" ON public.pendencias_pos_inauguracao
  FOR SELECT TO authenticated
  USING (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "pendencias_insert" ON public.pendencias_pos_inauguracao;
CREATE POLICY "pendencias_insert" ON public.pendencias_pos_inauguracao
  FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "pendencias_update" ON public.pendencias_pos_inauguracao;
CREATE POLICY "pendencias_update" ON public.pendencias_pos_inauguracao
  FOR UPDATE TO authenticated
  USING (public.is_authorized_team(auth.uid()))
  WITH CHECK (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "pendencias_delete" ON public.pendencias_pos_inauguracao;
CREATE POLICY "pendencias_delete" ON public.pendencias_pos_inauguracao
  FOR DELETE TO authenticated
  USING (public.is_authorized_team(auth.uid()));

DROP TRIGGER IF EXISTS trg_pendencias_updated_at ON public.pendencias_pos_inauguracao;
CREATE TRIGGER trg_pendencias_updated_at
  BEFORE UPDATE ON public.pendencias_pos_inauguracao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
