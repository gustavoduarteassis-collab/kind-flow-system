-- Item L: Audit log table for tracking critical changes
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized team can view audit log"
ON public.audit_log FOR SELECT TO authenticated
USING (public.is_authorized_team(auth.uid()));

CREATE POLICY "Authenticated can insert audit log"
ON public.audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE INDEX idx_audit_log_table_record ON public.audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);

-- Item K: Optimistic concurrency version columns
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.pipeline_stores ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Auto-increment version on update
CREATE OR REPLACE FUNCTION public.bump_version_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bump_version_stores ON public.stores;
CREATE TRIGGER bump_version_stores BEFORE UPDATE ON public.stores
FOR EACH ROW EXECUTE FUNCTION public.bump_version_column();

DROP TRIGGER IF EXISTS bump_version_pipeline_stores ON public.pipeline_stores;
CREATE TRIGGER bump_version_pipeline_stores BEFORE UPDATE ON public.pipeline_stores
FOR EACH ROW EXECUTE FUNCTION public.bump_version_column();