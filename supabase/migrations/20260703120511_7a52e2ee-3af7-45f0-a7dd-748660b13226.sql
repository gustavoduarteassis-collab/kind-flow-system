ALTER TABLE public.stores
  ADD COLUMN tipo_registro text NOT NULL DEFAULT 'nova';

ALTER TABLE public.stores
  ADD CONSTRAINT stores_tipo_registro_check
  CHECK (tipo_registro IN ('nova','reforma','repasse','encerramento','troca','interno'));

CREATE INDEX idx_stores_tipo_registro ON public.stores(tipo_registro);