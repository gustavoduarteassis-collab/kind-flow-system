
DROP POLICY IF EXISTS "Authenticated users can view all entries" ON public.custos_geral_entries;
DROP POLICY IF EXISTS "Users insert own entries" ON public.custos_geral_entries;
DROP POLICY IF EXISTS "Users update own entries" ON public.custos_geral_entries;
DROP POLICY IF EXISTS "Users delete own entries" ON public.custos_geral_entries;

CREATE POLICY "Team can view custos" ON public.custos_geral_entries
  FOR SELECT TO authenticated USING (public.is_authorized_team(auth.uid()));
CREATE POLICY "Team can insert custos" ON public.custos_geral_entries
  FOR INSERT TO authenticated WITH CHECK (public.is_authorized_team(auth.uid()) AND auth.uid() = user_id);
CREATE POLICY "Team can update custos" ON public.custos_geral_entries
  FOR UPDATE TO authenticated USING (public.is_authorized_team(auth.uid())) WITH CHECK (public.is_authorized_team(auth.uid()));
CREATE POLICY "Team can delete custos" ON public.custos_geral_entries
  FOR DELETE TO authenticated USING (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "All authenticated can view analyst_goals" ON public.analyst_goals;
CREATE POLICY "Team can view analyst_goals" ON public.analyst_goals
  FOR SELECT TO authenticated USING (public.is_authorized_team(auth.uid()));
