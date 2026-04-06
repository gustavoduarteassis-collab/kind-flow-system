
CREATE TABLE public.fornecedores_homologados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto TEXT NOT NULL DEFAULT '',
  empresa TEXT NOT NULL DEFAULT '',
  contato TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

ALTER TABLE public.fornecedores_homologados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view fornecedores"
ON public.fornecedores_homologados
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authorized team can insert fornecedores"
ON public.fornecedores_homologados
FOR INSERT
TO authenticated
WITH CHECK (is_authorized_team(auth.uid()));

CREATE POLICY "Authorized team can update fornecedores"
ON public.fornecedores_homologados
FOR UPDATE
TO authenticated
USING (is_authorized_team(auth.uid()))
WITH CHECK (is_authorized_team(auth.uid()));

CREATE POLICY "Authorized team can delete fornecedores"
ON public.fornecedores_homologados
FOR DELETE
TO authenticated
USING (is_authorized_team(auth.uid()));

CREATE TRIGGER update_fornecedores_homologados_updated_at
BEFORE UPDATE ON public.fornecedores_homologados
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
