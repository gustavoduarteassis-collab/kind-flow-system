ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS status_geral TEXT,
ADD COLUMN IF NOT EXISTS comentarios_obras TEXT,
ADD COLUMN IF NOT EXISTS cobranca_nota TEXT,
ADD COLUMN IF NOT EXISTS localizacao TEXT,
ADD COLUMN IF NOT EXISTS previsao_inauguracao_texto TEXT,
ADD COLUMN IF NOT EXISTS inicio_obra_texto TEXT;