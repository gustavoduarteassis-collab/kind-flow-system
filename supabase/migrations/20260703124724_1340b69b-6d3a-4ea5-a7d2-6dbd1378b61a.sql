-- Limpeza defensiva de artefatos de tentativa anterior
DROP INDEX IF EXISTS public.idx_pendencias_store;
DROP INDEX IF EXISTS public.idx_pendencias_status_store;
DROP INDEX IF EXISTS public.idx_pendencias_responsavel;

DO $$ BEGIN
  CREATE TYPE public.pendencia_aguardando AS ENUM ('franqueado','juridico','fornecedor','shopping','interno');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pendencia_status AS ENUM ('aberta','cobrada','resolvida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pendencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  aguardando_quem public.pendencia_aguardando NOT NULL,
  responsavel_interno text,
  prazo_cobranca date,
  status public.pendencia_status NOT NULL DEFAULT 'aberta',
  resolvido_em timestamptz,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_pendencias_store ON public.pendencias(store_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_status_store ON public.pendencias(status, store_id);
CREATE INDEX IF NOT EXISTS idx_pendencias_responsavel ON public.pendencias(responsavel_interno);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pendencias TO authenticated;
GRANT ALL ON public.pendencias TO service_role;

DROP TRIGGER IF EXISTS trg_pendencias_updated_at ON public.pendencias;
CREATE TRIGGER trg_pendencias_updated_at
BEFORE UPDATE ON public.pendencias
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_edit_pendencia(_responsavel text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.team_members
         WHERE user_id = auth.uid()
           AND lower(btrim(name)) = 'gustavo'
           AND deleted_at IS NULL
      )
      OR (
        _responsavel IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.team_members
           WHERE user_id = auth.uid()
             AND lower(btrim(name)) = lower(btrim(_responsavel))
             AND deleted_at IS NULL
        )
      )
    )
$$;

ALTER TABLE public.pendencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Autenticados podem ler pendencias" ON public.pendencias;
CREATE POLICY "Autenticados podem ler pendencias"
ON public.pendencias FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Gustavo ou responsavel pode inserir" ON public.pendencias;
CREATE POLICY "Gustavo ou responsavel pode inserir"
ON public.pendencias FOR INSERT TO authenticated
WITH CHECK (public.can_edit_pendencia(responsavel_interno));

DROP POLICY IF EXISTS "Gustavo ou responsavel pode atualizar" ON public.pendencias;
CREATE POLICY "Gustavo ou responsavel pode atualizar"
ON public.pendencias FOR UPDATE TO authenticated
USING (public.can_edit_pendencia(responsavel_interno))
WITH CHECK (public.can_edit_pendencia(responsavel_interno));

DROP POLICY IF EXISTS "Gustavo ou responsavel pode deletar" ON public.pendencias;
CREATE POLICY "Gustavo ou responsavel pode deletar"
ON public.pendencias FOR DELETE TO authenticated
USING (public.can_edit_pendencia(responsavel_interno));