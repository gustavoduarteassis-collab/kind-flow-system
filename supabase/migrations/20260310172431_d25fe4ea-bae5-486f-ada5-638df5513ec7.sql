
CREATE TABLE public.custos_geral_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  ano INTEGER NOT NULL DEFAULT 2026,
  tipo TEXT NOT NULL DEFAULT 'TRADICIONAL',
  local TEXT NOT NULL DEFAULT 'SHOPPING',
  estado TEXT NOT NULL DEFAULT '',
  regional TEXT NOT NULL DEFAULT '',
  area_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  area_loja NUMERIC(10,2) NOT NULL DEFAULT 0,
  prazo TEXT NOT NULL DEFAULT '',
  mao_de_obra NUMERIC(12,2) NOT NULL DEFAULT 0,
  moveis NUMERIC(12,2) NOT NULL DEFAULT 0,
  piso NUMERIC(12,2) NOT NULL DEFAULT 0,
  iluminacao NUMERIC(12,2) NOT NULL DEFAULT 0,
  informatica NUMERIC(12,2) NOT NULL DEFAULT 0,
  demais_itens NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custos_geral_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all entries"
  ON public.custos_geral_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users insert own entries"
  ON public.custos_geral_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own entries"
  ON public.custos_geral_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own entries"
  ON public.custos_geral_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
