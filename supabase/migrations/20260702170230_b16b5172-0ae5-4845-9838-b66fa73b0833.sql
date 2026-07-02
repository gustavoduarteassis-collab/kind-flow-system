
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS metragem_m2 numeric,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS email_loja text,
  ADD COLUMN IF NOT EXISTS cnpj text,
  ADD COLUMN IF NOT EXISTS marca text,
  ADD COLUMN IF NOT EXISTS shopping_nome text,
  ADD COLUMN IF NOT EXISTS observacoes_gerais text;
