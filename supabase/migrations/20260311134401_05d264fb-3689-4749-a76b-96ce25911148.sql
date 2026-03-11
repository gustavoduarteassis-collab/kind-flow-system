
-- Create task_comments table
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- All authenticated can view comments
CREATE POLICY "All authenticated can view task comments"
ON public.task_comments FOR SELECT TO authenticated USING (true);

-- All authenticated can insert comments
CREATE POLICY "All authenticated can insert task comments"
ON public.task_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- All authenticated can delete own comments
CREATE POLICY "All authenticated can delete own task comments"
ON public.task_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Update team_events policies: allow all authenticated to update events (for editing description)
DROP POLICY IF EXISTS "Authorized team manages team events" ON public.team_events;

CREATE POLICY "All authenticated can view team events"
ON public.team_events FOR SELECT TO authenticated USING (true);

CREATE POLICY "All authenticated can insert team events"
ON public.team_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "All authenticated can update team events"
ON public.team_events FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "All authenticated can delete team events"
ON public.team_events FOR DELETE TO authenticated
USING (true);
