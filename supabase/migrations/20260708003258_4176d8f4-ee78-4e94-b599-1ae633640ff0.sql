CREATE TABLE IF NOT EXISTS public.visitas_cronograma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_store_id uuid REFERENCES public.pipeline_stores(id) ON DELETE SET NULL,
  filial text,
  loja_nome text NOT NULL,
  cidade text,
  uf text,
  analista_responsavel text,
  data_visita_tecnica date,
  data_chegada_implantacao date,
  data_inauguracao date,
  status_passagem_visita text NOT NULL DEFAULT 'COMPRAR'
    CHECK (status_passagem_visita IN ('COMPRAR','COMPRADA','NAO_PRECISA','EM_APROVACAO','CANCELADA')),
  status_passagem_chegada text NOT NULL DEFAULT 'COMPRAR'
    CHECK (status_passagem_chegada IN ('COMPRAR','COMPRADA','NAO_PRECISA','EM_APROVACAO','CANCELADA')),
  confirmacao_visita text,
  confirmacao_chegada text,
  visita_realizada boolean DEFAULT false,
  implantacao_realizada boolean DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_visitas_filial ON public.visitas_cronograma(filial);
CREATE INDEX IF NOT EXISTS idx_visitas_analista ON public.visitas_cronograma(analista_responsavel);
CREATE INDEX IF NOT EXISTS idx_visitas_data_visita ON public.visitas_cronograma(data_visita_tecnica);
CREATE INDEX IF NOT EXISTS idx_visitas_data_chegada ON public.visitas_cronograma(data_chegada_implantacao);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitas_cronograma TO authenticated;
GRANT ALL ON public.visitas_cronograma TO service_role;

ALTER TABLE public.visitas_cronograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Time autorizado pode ver visitas"
  ON public.visitas_cronograma FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()));

CREATE POLICY "Time autorizado pode inserir visitas"
  ON public.visitas_cronograma FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()));

CREATE POLICY "Time autorizado pode atualizar visitas"
  ON public.visitas_cronograma FOR UPDATE
  TO authenticated
  USING (public.is_authorized_team(auth.uid()));

DROP TRIGGER IF EXISTS trg_visitas_updated_at ON public.visitas_cronograma;
CREATE TRIGGER trg_visitas_updated_at
  BEFORE UPDATE ON public.visitas_cronograma
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();