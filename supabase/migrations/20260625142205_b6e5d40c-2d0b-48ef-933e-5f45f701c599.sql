
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP POLICY IF EXISTS "All authenticated users can view diary" ON public.construction_diary;
CREATE POLICY "Authorized team can view diary" ON public.construction_diary
  FOR SELECT TO authenticated USING (public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "All authenticated users can view diary photos" ON public.diary_photos;
CREATE POLICY "Authorized team can view diary photos" ON public.diary_photos
  FOR SELECT TO authenticated USING (public.is_authorized_team(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_stores_user_id ON public.stores(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stores_user_id ON public.pipeline_stores(user_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_stores_filial ON public.pipeline_stores(filial);
CREATE INDEX IF NOT EXISTS idx_construction_diary_store_id ON public.construction_diary(store_id);
CREATE INDEX IF NOT EXISTS idx_construction_diary_user_id ON public.construction_diary(user_id);
CREATE INDEX IF NOT EXISTS idx_construction_diary_entry_date ON public.construction_diary(entry_date);
CREATE INDEX IF NOT EXISTS idx_diary_photos_diary_id ON public.diary_photos(diary_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_team_events_user_id ON public.team_events(user_id);
CREATE INDEX IF NOT EXISTS idx_team_events_event_date ON public.team_events(event_date);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_custos_geral_entries_ano_tipo ON public.custos_geral_entries(ano, tipo);
CREATE INDEX IF NOT EXISTS idx_custos_geral_entries_user_id ON public.custos_geral_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_access_email_lower ON public.franchisee_access(lower(franchisee_email));
CREATE INDEX IF NOT EXISTS idx_franchisee_access_store_id ON public.franchisee_access(store_id);
CREATE INDEX IF NOT EXISTS idx_agm_entries_mes_indicador ON public.agm_entries(mes_referencia, indicador);
CREATE INDEX IF NOT EXISTS idx_agm_action_plans_mes_indicador ON public.agm_action_plans(mes_referencia, indicador);
CREATE INDEX IF NOT EXISTS idx_habit_completions_team_member ON public.habit_completions(team_member_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_fornecedores_homologados_user_id ON public.fornecedores_homologados(user_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_prospeccao_user_id ON public.fornecedores_prospeccao(user_id);
CREATE INDEX IF NOT EXISTS idx_analyst_goals_user_id ON public.analyst_goals(user_id);
