
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authorized team manages tasks" ON public.tasks;

-- Allow all authenticated users to view all tasks
CREATE POLICY "All authenticated can view tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (true);

-- Allow all authenticated users to insert tasks (with their own user_id)
CREATE POLICY "All authenticated can insert tasks"
ON public.tasks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users to update any task
CREATE POLICY "All authenticated can update tasks"
ON public.tasks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow all authenticated users to delete any task
CREATE POLICY "All authenticated can delete tasks"
ON public.tasks FOR DELETE
TO authenticated
USING (true);
