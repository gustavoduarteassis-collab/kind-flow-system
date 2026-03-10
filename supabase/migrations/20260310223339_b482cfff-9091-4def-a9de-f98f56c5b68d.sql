
-- Table for supplier prospecting/evaluation
CREATE TABLE public.fornecedores_prospeccao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome_empresa TEXT NOT NULL,
  contato TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  produto_servico TEXT NOT NULL DEFAULT '',
  proposta_url TEXT NOT NULL DEFAULT '',
  avaliacao INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'novo',
  observacoes TEXT NOT NULL DEFAULT '',
  analista_responsavel TEXT NOT NULL DEFAULT '',
  mes_referencia TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fornecedores_prospeccao ENABLE ROW LEVEL SECURITY;

-- All authenticated can view
CREATE POLICY "All authenticated view fornecedores_prospeccao"
  ON public.fornecedores_prospeccao FOR SELECT
  TO authenticated
  USING (true);

-- Authorized team can insert
CREATE POLICY "Authorized team insert fornecedores_prospeccao"
  ON public.fornecedores_prospeccao FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Authorized team can update
CREATE POLICY "Authorized team update fornecedores_prospeccao"
  ON public.fornecedores_prospeccao FOR UPDATE
  TO authenticated
  USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()))
  WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Authorized team can delete
CREATE POLICY "Authorized team delete fornecedores_prospeccao"
  ON public.fornecedores_prospeccao FOR DELETE
  TO authenticated
  USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_fornecedores_prospeccao_updated_at
  BEFORE UPDATE ON public.fornecedores_prospeccao
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
