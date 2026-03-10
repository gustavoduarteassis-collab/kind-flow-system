ALTER TABLE public.pipeline_stores 
ADD COLUMN IF NOT EXISTS analista_obra text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_projeto_arquitetonico text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_projeto_eletrico text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_projeto_incendio text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_projeto_estrutural text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_projeto_ar_condicionado text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_orcamento_obra text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS prazo_contratos text NOT NULL DEFAULT '';