
-- Fix stores UPDATE policy
DROP POLICY IF EXISTS "All authenticated users can update stores" ON public.stores;
CREATE POLICY "Owner or team can update stores"
ON public.stores FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Fix pipeline_stores UPDATE policy
DROP POLICY IF EXISTS "All authenticated users can update pipeline" ON public.pipeline_stores;
CREATE POLICY "Owner or team can update pipeline"
ON public.pipeline_stores FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Fix tasks UPDATE policy
DROP POLICY IF EXISTS "All authenticated can update tasks" ON public.tasks;
CREATE POLICY "Owner or team can update tasks"
ON public.tasks FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Fix tasks DELETE policy
DROP POLICY IF EXISTS "All authenticated can delete tasks" ON public.tasks;
CREATE POLICY "Owner or team can delete tasks"
ON public.tasks FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Fix team_events UPDATE policy
DROP POLICY IF EXISTS "All authenticated can update team events" ON public.team_events;
CREATE POLICY "Owner or team can update team events"
ON public.team_events FOR UPDATE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));

-- Fix team_events DELETE policy
DROP POLICY IF EXISTS "All authenticated can delete team events" ON public.team_events;
CREATE POLICY "Owner or team can delete team events"
ON public.team_events FOR DELETE TO authenticated
USING ((auth.uid() = user_id) OR is_authorized_team(auth.uid()));
