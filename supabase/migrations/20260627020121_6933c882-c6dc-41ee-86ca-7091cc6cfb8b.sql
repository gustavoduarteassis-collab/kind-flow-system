-- Soft delete global: adiciona deleted_at/deleted_by nas tabelas principais
ALTER TABLE public.stores            ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.pipeline_stores   ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.tasks             ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.team_members      ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.franchisee_access ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.habits            ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.team_events       ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.custos_geral_entries ADD COLUMN IF NOT EXISTS deleted_at timestamptz, ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Índices parciais para queries que filtram deleted_at IS NULL
CREATE INDEX IF NOT EXISTS idx_stores_not_deleted            ON public.stores (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pipeline_stores_not_deleted   ON public.pipeline_stores (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted             ON public.tasks (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_not_deleted      ON public.team_members (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_franchisee_access_not_deleted ON public.franchisee_access (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_habits_not_deleted            ON public.habits (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_team_events_not_deleted       ON public.team_events (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custos_geral_not_deleted      ON public.custos_geral_entries (created_at DESC) WHERE deleted_at IS NULL;

-- RPC helper para restaurar registros (usada pelas telas de "Itens excluídos")
CREATE OR REPLACE FUNCTION public.soft_restore(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _table NOT IN (
    'stores','pipeline_stores','tasks','team_members',
    'franchisee_access','habits','team_events','custos_geral_entries'
  ) THEN
    RAISE EXCEPTION 'Tabela % não suportada para restore', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    _table
  ) USING _id;
END;
$$;
