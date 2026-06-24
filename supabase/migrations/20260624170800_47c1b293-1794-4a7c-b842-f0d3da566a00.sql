ALTER TABLE public.pipeline_stores
  ADD COLUMN IF NOT EXISTS construtora TEXT,
  ADD COLUMN IF NOT EXISTS telefone_franqueado TEXT,
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS razao_social TEXT,
  ADD COLUMN IF NOT EXISTS endereco TEXT,
  ADD COLUMN IF NOT EXISTS cep TEXT,
  ADD COLUMN IF NOT EXISTS capex_previsto TEXT,
  ADD COLUMN IF NOT EXISTS data_contrato_franquia TEXT,
  ADD COLUMN IF NOT EXISTS responsavel_interno TEXT;