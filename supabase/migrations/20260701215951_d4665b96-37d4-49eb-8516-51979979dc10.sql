
DROP POLICY IF EXISTS "All authenticated can view tasks" ON public.tasks;
CREATE POLICY "Owner or team can view tasks" ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "All authenticated can view task comments" ON public.task_comments;
CREATE POLICY "Owner or team can view task comments" ON public.task_comments FOR SELECT
  USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "task_updates_select_all_auth" ON public.task_updates;
CREATE POLICY "task_updates_select_owner_or_team" ON public.task_updates FOR SELECT
  USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

DROP POLICY IF EXISTS "All authenticated can view team events" ON public.team_events;
CREATE POLICY "Owner or team can view team events" ON public.team_events FOR SELECT
  USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));
