
-- Security definer function to check if a user is an authorized team member
CREATE OR REPLACE FUNCTION public.is_authorized_team(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM authorized_team_emails ate
    JOIN auth.users u ON lower(u.email) = lower(ate.email)
    WHERE u.id = check_user_id
  )
$$;

-- 1. Fix stores DELETE: allow authorized team to delete any store
DROP POLICY IF EXISTS "All authenticated users can delete own stores" ON public.stores;
CREATE POLICY "Authorized team can delete stores" ON public.stores
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 2. Fix team_members: allow authorized team to manage all team data
DROP POLICY IF EXISTS "Users manage own team members" ON public.team_members;
CREATE POLICY "Authorized team manages team members" ON public.team_members
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 3. Fix tasks
DROP POLICY IF EXISTS "Users manage own tasks" ON public.tasks;
CREATE POLICY "Authorized team manages tasks" ON public.tasks
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 4. Fix habits
DROP POLICY IF EXISTS "Users manage own habits" ON public.habits;
CREATE POLICY "Authorized team manages habits" ON public.habits
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 5. Fix habit_completions
DROP POLICY IF EXISTS "Users manage own habit completions" ON public.habit_completions;
CREATE POLICY "Authorized team manages habit completions" ON public.habit_completions
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 6. Fix team_events
DROP POLICY IF EXISTS "Users manage own team events" ON public.team_events;
CREATE POLICY "Authorized team manages team events" ON public.team_events
FOR ALL TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 7. Fix pipeline_stores DELETE
DROP POLICY IF EXISTS "Users delete own pipeline stores" ON public.pipeline_stores;
CREATE POLICY "Authorized team can delete pipeline stores" ON public.pipeline_stores
FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 8. Enable realtime for stores and pipeline_stores
ALTER PUBLICATION supabase_realtime ADD TABLE public.stores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stores;
