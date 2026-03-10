ALTER TABLE public.pipeline_stores 
ADD COLUMN data_liberacao_orcamento text NOT NULL DEFAULT '',
ADD COLUMN prazo_conclusao_orcamento text NOT NULL DEFAULT '';