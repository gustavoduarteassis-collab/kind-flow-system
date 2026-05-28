-- Add new fields to stores
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS razao_social TEXT,
ADD COLUMN IF NOT EXISTS porte TEXT CHECK (porte IN ('Compacta', 'Padrão', 'Ampliada')),
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT,
ADD COLUMN IF NOT EXISTS fase_atual TEXT DEFAULT 'Pré-Obra' CHECK (fase_atual IN ('Pré-Obra', 'Obra', 'Setup', 'Abertura'));

-- Ensure team_members roles are consistent with the requirement
-- We can add a constraint or just use text.
-- Admin, Coordenador, Analista
ALTER TABLE public.team_members 
ALTER COLUMN role SET DEFAULT 'Analista';

-- Grant access (assuming roles exist or just to authenticated)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
