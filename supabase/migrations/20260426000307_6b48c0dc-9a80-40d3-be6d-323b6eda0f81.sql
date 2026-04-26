-- Add columns for tracking action plans
ALTER TABLE public.agm_action_plans 
ADD COLUMN IF NOT EXISTS realizado TEXT,
ADD COLUMN IF NOT EXISTS status_concluido BOOLEAN DEFAULT false;

-- Update updated_at trigger if it exists or create it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_agm_action_plans_updated_at') THEN
        CREATE TRIGGER update_agm_action_plans_updated_at
        BEFORE UPDATE ON public.agm_action_plans
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;