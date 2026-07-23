
ALTER TABLE public.stores DROP CONSTRAINT stores_tipo_registro_check;
ALTER TABLE public.stores ADD CONSTRAINT stores_tipo_registro_check
  CHECK (tipo_registro = ANY (ARRAY['nova','reforma','repasse','encerramento','troca','interno','inaugurada']));
