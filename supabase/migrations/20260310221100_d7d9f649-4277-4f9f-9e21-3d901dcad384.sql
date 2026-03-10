
ALTER TABLE public.pipeline_stores 
ADD COLUMN inicio_projeto_arquitetonico text NOT NULL DEFAULT '',
ADD COLUMN inicio_projeto_eletrico text NOT NULL DEFAULT '',
ADD COLUMN inicio_projeto_incendio text NOT NULL DEFAULT '',
ADD COLUMN inicio_projeto_estrutural text NOT NULL DEFAULT '',
ADD COLUMN inicio_projeto_ar_condicionado text NOT NULL DEFAULT '',
ADD COLUMN inicio_orcamento_obra text NOT NULL DEFAULT '',
ADD COLUMN inicio_contratos text NOT NULL DEFAULT '';
