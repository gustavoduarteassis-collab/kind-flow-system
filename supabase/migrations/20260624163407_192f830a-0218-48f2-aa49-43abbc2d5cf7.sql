
ALTER TABLE public.pipeline_stores
  ADD COLUMN IF NOT EXISTS reforma boolean NOT NULL DEFAULT false;
