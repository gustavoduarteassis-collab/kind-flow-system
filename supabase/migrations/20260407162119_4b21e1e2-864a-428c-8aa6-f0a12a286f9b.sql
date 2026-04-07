CREATE TABLE public.analyst_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analyst_name TEXT NOT NULL,
  indicador TEXT NOT NULL,
  polaridade TEXT NOT NULL DEFAULT '↑',
  valor_ano TEXT NOT NULL DEFAULT '',
  peso NUMERIC NOT NULL DEFAULT 0,
  metas_mensais JSONB NOT NULL DEFAULT '{}',
  realizados_mensais JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.analyst_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view analyst_goals"
  ON public.analyst_goals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authorized team can insert analyst_goals"
  ON public.analyst_goals FOR INSERT TO authenticated
  WITH CHECK (is_authorized_team(auth.uid()));

CREATE POLICY "Authorized team can update analyst_goals"
  ON public.analyst_goals FOR UPDATE TO authenticated
  USING (is_authorized_team(auth.uid()))
  WITH CHECK (is_authorized_team(auth.uid()));

CREATE POLICY "Authorized team can delete analyst_goals"
  ON public.analyst_goals FOR DELETE TO authenticated
  USING (is_authorized_team(auth.uid()));

CREATE TRIGGER update_analyst_goals_updated_at
  BEFORE UPDATE ON public.analyst_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();