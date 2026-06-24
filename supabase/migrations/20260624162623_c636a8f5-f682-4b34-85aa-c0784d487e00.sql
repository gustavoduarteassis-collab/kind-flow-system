
-- Add new fields to pipeline_stores for Funil 2026 import
ALTER TABLE public.pipeline_stores
  ADD COLUMN IF NOT EXISTS area_total text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gerente_regional text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS analista_arquitetura text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS implantadora text NOT NULL DEFAULT '';

-- Create import_logs table for Funil 2026 import history
CREATE TABLE IF NOT EXISTS public.funil_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  created_count integer NOT NULL DEFAULT 0,
  updated_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.funil_import_logs TO authenticated;
GRANT ALL ON public.funil_import_logs TO service_role;

ALTER TABLE public.funil_import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized team can view import logs"
  ON public.funil_import_logs FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()));

CREATE POLICY "Authorized team can insert import logs"
  ON public.funil_import_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()) AND auth.uid() = user_id);
