
-- Add start_date to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date date;

-- Create team_events table for calendar
CREATE TABLE public.team_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  event_type text NOT NULL DEFAULT 'outro',
  event_date date NOT NULL,
  end_date date,
  store_name text,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own team events"
ON public.team_events
FOR ALL
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
