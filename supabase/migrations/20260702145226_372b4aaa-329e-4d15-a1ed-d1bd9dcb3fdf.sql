
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS stage_status_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS stage_status_updated_by uuid;
