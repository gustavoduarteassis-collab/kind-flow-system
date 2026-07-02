
-- 1) Colunas de datas em stores (aditivas, NULL permitido)
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS data_contrato_locacao date,
  ADD COLUMN IF NOT EXISTS data_liberacao_chaves date,
  ADD COLUMN IF NOT EXISTS demolicao_prev date,
  ADD COLUMN IF NOT EXISTS demolicao_real date,
  ADD COLUMN IF NOT EXISTS obra_inicio_prev date,
  ADD COLUMN IF NOT EXISTS obra_inicio_real date,
  ADD COLUMN IF NOT EXISTS moveis_prev date,
  ADD COLUMN IF NOT EXISTS moveis_real date,
  ADD COLUMN IF NOT EXISTS produtos_prev date,
  ADD COLUMN IF NOT EXISTS produtos_real date,
  ADD COLUMN IF NOT EXISTS inauguracao_real date,
  ADD COLUMN IF NOT EXISTS visita_tecnica_real date,
  ADD COLUMN IF NOT EXISTS ultima_atualizacao text,
  ADD COLUMN IF NOT EXISTS ultima_atualizacao_at timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_atualizacao_autor text;

-- 2) Tabela store_updates
CREATE TABLE IF NOT EXISTS public.store_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  texto text NOT NULL,
  autor_nome text,
  autor_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_updates TO authenticated;
GRANT ALL ON public.store_updates TO service_role;

ALTER TABLE public.store_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth can view store updates"
  ON public.store_updates FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL OR public.is_authorized_team(auth.uid()));

CREATE POLICY "Auth can insert store updates"
  ON public.store_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Author or team can update store updates"
  ON public.store_updates FOR UPDATE
  TO authenticated
  USING (autor_user_id = auth.uid() OR public.is_authorized_team(auth.uid()))
  WITH CHECK (autor_user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

CREATE POLICY "Author or team can delete store updates"
  ON public.store_updates FOR DELETE
  TO authenticated
  USING (autor_user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_store_updates_store ON public.store_updates(store_id, created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_store_updates_updated_at
  BEFORE UPDATE ON public.store_updates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Trigger para manter stores.ultima_atualizacao em cache
CREATE OR REPLACE FUNCTION public.refresh_store_ultima_atualizacao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_store uuid;
  v_rec RECORD;
BEGIN
  v_store := COALESCE(NEW.store_id, OLD.store_id);
  IF v_store IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT texto, created_at, autor_nome INTO v_rec
    FROM public.store_updates
   WHERE store_id = v_store AND deleted_at IS NULL
   ORDER BY created_at DESC
   LIMIT 1;

  UPDATE public.stores
     SET ultima_atualizacao = v_rec.texto,
         ultima_atualizacao_at = v_rec.created_at,
         ultima_atualizacao_autor = v_rec.autor_nome
   WHERE id = v_store;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_store_updates_refresh_cache
  AFTER INSERT OR UPDATE OR DELETE ON public.store_updates
  FOR EACH ROW EXECUTE FUNCTION public.refresh_store_ultima_atualizacao();
