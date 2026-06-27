-- Extend soft delete to remaining tables
ALTER TABLE public.habit_completions ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.agm_action_plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.agm_planos_acao ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.agm_entries ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.fornecedores_homologados ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.fornecedores_prospeccao ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.construction_diary ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.diary_photos ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.task_comments ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.analyst_goals ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS idx_habit_completions_active ON public.habit_completions(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agm_action_plans_active ON public.agm_action_plans(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agm_planos_acao_active ON public.agm_planos_acao(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_agm_entries_active ON public.agm_entries(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fornecedores_homologados_active ON public.fornecedores_homologados(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fornecedores_prospeccao_active ON public.fornecedores_prospeccao(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_construction_diary_active ON public.construction_diary(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_diary_photos_active ON public.diary_photos(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_task_comments_active ON public.task_comments(id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_analyst_goals_active ON public.analyst_goals(id) WHERE deleted_at IS NULL;

-- Update soft_restore RPC to support all tables
CREATE OR REPLACE FUNCTION public.soft_restore(_table text, _id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_authorized_team(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF _table NOT IN (
    'stores','pipeline_stores','tasks','team_members',
    'franchisee_access','habits','team_events','custos_geral_entries',
    'habit_completions','agm_action_plans','agm_planos_acao','agm_entries',
    'fornecedores_homologados','fornecedores_prospeccao','construction_diary',
    'diary_photos','task_comments','analyst_goals'
  ) THEN
    RAISE EXCEPTION 'Tabela % não suportada para restore', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    _table
  ) USING _id;
END;
$function$;

-- RPC para listar itens excluídos (limitado a authorized team)
CREATE OR REPLACE FUNCTION public.list_soft_deleted(_table text)
 RETURNS TABLE(id uuid, deleted_at timestamptz, deleted_by uuid, label text)
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_authorized_team(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _table = 'stores' THEN
    RETURN QUERY SELECT s.id, s.deleted_at, s.deleted_by, s.name::text FROM public.stores s WHERE s.deleted_at IS NOT NULL ORDER BY s.deleted_at DESC;
  ELSIF _table = 'pipeline_stores' THEN
    RETURN QUERY SELECT p.id, p.deleted_at, p.deleted_by, COALESCE(p.nome_loja, p.codigo_loja)::text FROM public.pipeline_stores p WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC;
  ELSIF _table = 'tasks' THEN
    RETURN QUERY SELECT t.id, t.deleted_at, t.deleted_by, t.title::text FROM public.tasks t WHERE t.deleted_at IS NOT NULL ORDER BY t.deleted_at DESC;
  ELSIF _table = 'team_members' THEN
    RETURN QUERY SELECT m.id, m.deleted_at, m.deleted_by, m.name::text FROM public.team_members m WHERE m.deleted_at IS NOT NULL ORDER BY m.deleted_at DESC;
  ELSIF _table = 'franchisee_access' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, f.email::text FROM public.franchisee_access f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'habits' THEN
    RETURN QUERY SELECT h.id, h.deleted_at, h.deleted_by, h.title::text FROM public.habits h WHERE h.deleted_at IS NOT NULL ORDER BY h.deleted_at DESC;
  ELSIF _table = 'team_events' THEN
    RETURN QUERY SELECT e.id, e.deleted_at, e.deleted_by, e.title::text FROM public.team_events e WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC;
  ELSIF _table = 'custos_geral_entries' THEN
    RETURN QUERY SELECT c.id, c.deleted_at, c.deleted_by, (c.categoria || ' - ' || COALESCE(c.descricao,''))::text FROM public.custos_geral_entries c WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC;
  ELSE
    RAISE EXCEPTION 'Tabela % não suportada', _table;
  END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_soft_deleted(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.soft_restore(text, uuid) TO authenticated;