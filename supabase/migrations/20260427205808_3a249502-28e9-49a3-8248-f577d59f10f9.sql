ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS action_plans JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.stores.action_plans IS 'Armazena a lista de planos de ação (tarefas, responsáveis, prazos) para cada loja.';