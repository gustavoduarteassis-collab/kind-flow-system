
CREATE TABLE public.pipeline_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filial text NOT NULL DEFAULT '',
  local text NOT NULL DEFAULT '',
  cidade text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT '',
  padrao text NOT NULL DEFAULT 'Tradicional',
  localizacao text NOT NULL DEFAULT '',
  franqueado text NOT NULL DEFAULT '',
  contato_franqueado text NOT NULL DEFAULT '',
  email_franqueado text NOT NULL DEFAULT '',
  previsao_inauguracao text NOT NULL DEFAULT '',
  data_inauguracao text NOT NULL DEFAULT '',
  inicio_obra text NOT NULL DEFAULT '',
  status_geral text NOT NULL DEFAULT '',
  cd_origem text NOT NULL DEFAULT '',
  projeto_arquitetonico text NOT NULL DEFAULT 'pendente',
  projeto_eletrico text NOT NULL DEFAULT 'pendente',
  projeto_incendio text NOT NULL DEFAULT 'pendente',
  projeto_estrutural text NOT NULL DEFAULT 'pendente',
  projeto_ar_condicionado text NOT NULL DEFAULT 'pendente',
  orcamento_obra text NOT NULL DEFAULT 'pendente',
  contratos text NOT NULL DEFAULT 'pendente',
  observacoes text NOT NULL DEFAULT '',
  transferido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view pipeline"
ON public.pipeline_stores FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users insert own pipeline stores"
ON public.pipeline_stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated users can update pipeline"
ON public.pipeline_stores FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Users delete own pipeline stores"
ON public.pipeline_stores FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
