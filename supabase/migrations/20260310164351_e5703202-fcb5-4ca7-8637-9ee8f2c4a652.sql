ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS tipo_loja text NOT NULL DEFAULT '';
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS inauguracao_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;