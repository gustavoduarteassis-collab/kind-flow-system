
-- Immutable log of status changes for pipeline projects (Fase 1 do Funil)
CREATE TABLE public.pipeline_project_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_store_id uuid NOT NULL REFERENCES public.pipeline_stores(id) ON DELETE CASCADE,
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  project_key text NOT NULL,
  status_anterior text,
  status_novo text NOT NULL,
  observacao text,
  changed_by uuid REFERENCES auth.users(id),
  changed_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.pipeline_project_log TO authenticated;
GRANT ALL ON public.pipeline_project_log TO service_role;

ALTER TABLE public.pipeline_project_log ENABLE ROW LEVEL SECURITY;

-- Authorized team can read everything
CREATE POLICY "Authorized team can read project log"
  ON public.pipeline_project_log FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()));

-- Authorized team can insert (append-only)
CREATE POLICY "Authorized team can append project log"
  ON public.pipeline_project_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()) AND changed_by = auth.uid());

-- NOTE: no UPDATE/DELETE policies = immutable for clients.

CREATE INDEX idx_pipeline_project_log_store ON public.pipeline_project_log(pipeline_store_id, created_at DESC);
CREATE INDEX idx_pipeline_project_log_store_id ON public.pipeline_project_log(store_id);

-- Hard block any UPDATE/DELETE even by superuser-like roles via trigger
CREATE OR REPLACE FUNCTION public.prevent_log_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'pipeline_project_log is append-only';
END;
$$;

CREATE TRIGGER pipeline_project_log_no_update
  BEFORE UPDATE ON public.pipeline_project_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_log_mutation();

CREATE TRIGGER pipeline_project_log_no_delete
  BEFORE DELETE ON public.pipeline_project_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_log_mutation();
