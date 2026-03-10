
-- AGM monthly entries (indicators with meta vs realizado)
CREATE TABLE public.agm_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_referencia text NOT NULL DEFAULT '',
  indicador text NOT NULL DEFAULT '',
  meta_valor text NOT NULL DEFAULT '',
  realizado_valor text NOT NULL DEFAULT '',
  observacoes text NOT NULL DEFAULT '',
  detalhes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- AGM action plans (causa raiz + plano de ação)
CREATE TABLE public.agm_action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mes_referencia text NOT NULL DEFAULT '',
  indicador text NOT NULL DEFAULT '',
  causa text NOT NULL DEFAULT '',
  fenomeno text NOT NULL DEFAULT '',
  acao text NOT NULL DEFAULT '',
  como text NOT NULL DEFAULT '',
  responsavel text NOT NULL DEFAULT '',
  prazo_inicial text NOT NULL DEFAULT '',
  prazo_final text NOT NULL DEFAULT '',
  farol text NOT NULL DEFAULT 'amarelo',
  ai_generated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.agm_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agm_action_plans ENABLE ROW LEVEL SECURITY;

-- Only the owner can CRUD their AGM data
CREATE POLICY "Users manage own agm_entries" ON public.agm_entries
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own agm_action_plans" ON public.agm_action_plans
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_agm_entries_updated_at
  BEFORE UPDATE ON public.agm_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agm_action_plans_updated_at
  BEFORE UPDATE ON public.agm_action_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
