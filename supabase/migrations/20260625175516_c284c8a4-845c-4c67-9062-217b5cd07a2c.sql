
-- Sequence for codigo
CREATE SEQUENCE IF NOT EXISTS public.agm_planos_acao_seq START 1;

CREATE TABLE public.agm_planos_acao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE DEFAULT ('PA-' || lpad(nextval('public.agm_planos_acao_seq')::text, 3, '0')),
  origem text NOT NULL,
  mes_criacao text NOT NULL,
  causa text NOT NULL,
  acao text NOT NULL,
  como text,
  responsavel text NOT NULL,
  prazo_inicial date,
  prazo_final date NOT NULL,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','em_andamento','concluido','atrasado')),
  data_conclusao date,
  ultima_atualizacao_data date,
  ultima_atualizacao_texto text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agm_planos_acao TO authenticated;
GRANT ALL ON public.agm_planos_acao TO service_role;
GRANT USAGE ON SEQUENCE public.agm_planos_acao_seq TO authenticated;

ALTER TABLE public.agm_planos_acao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autorizada gerencia planos AGM"
  ON public.agm_planos_acao FOR ALL
  TO authenticated
  USING (public.is_authorized_team(auth.uid()))
  WITH CHECK (public.is_authorized_team(auth.uid()));

CREATE TRIGGER trg_agm_planos_acao_updated
  BEFORE UPDATE ON public.agm_planos_acao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updates history
CREATE TABLE public.agm_plano_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.agm_planos_acao(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  texto text NOT NULL,
  autor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agm_plano_updates TO authenticated;
GRANT ALL ON public.agm_plano_updates TO service_role;

ALTER TABLE public.agm_plano_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Equipe autorizada gerencia updates planos AGM"
  ON public.agm_plano_updates FOR ALL
  TO authenticated
  USING (public.is_authorized_team(auth.uid()))
  WITH CHECK (public.is_authorized_team(auth.uid()));

CREATE INDEX idx_agm_plano_updates_plano ON public.agm_plano_updates(plano_id, data DESC);
CREATE INDEX idx_agm_planos_acao_status ON public.agm_planos_acao(status, prazo_final);
