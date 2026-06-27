
-- 1) Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  related_table TEXT,
  related_id UUID,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- 2) Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

-- 3) RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

CREATE POLICY "Owner can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Authorized team can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "Owner soft delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

-- 4) Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, created_at DESC)
  WHERE read_at IS NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON public.notifications(user_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- 5) Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 6) Helper: mark all as read for the current user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid()
     AND read_at IS NULL
     AND deleted_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;

-- 7) Trigger: notify assignee on new task / on assignee change
CREATE OR REPLACE FUNCTION public.notify_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  IF NEW.assigned_to IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS NOT DISTINCT FROM NEW.assigned_to THEN
    RETURN NEW;
  END IF;

  -- team_members.user_id is the auth uid of the assignee
  SELECT user_id INTO v_user_id FROM public.team_members WHERE id = NEW.assigned_to;
  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table, related_id)
  VALUES (
    v_user_id,
    'task_assigned',
    'Nova tarefa atribuída a você',
    COALESCE(NEW.title, 'Sem título'),
    '/equipe?tab=tarefas&task=' || NEW.id::text,
    'tasks',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_assigned ON public.tasks;
CREATE TRIGGER trg_notify_task_assigned
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- 8) Trigger: notify creator on task completion
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_completer_name TEXT;
BEGIN
  IF NEW.status::text <> 'concluida' THEN RETURN NEW; END IF;
  IF OLD.status::text = 'concluida' THEN RETURN NEW; END IF;
  IF NEW.user_id IS NULL OR NEW.user_id = auth.uid() THEN RETURN NEW; END IF;

  SELECT name INTO v_completer_name FROM public.team_members WHERE id = NEW.assigned_to;

  INSERT INTO public.notifications (user_id, type, title, message, link, related_table, related_id)
  VALUES (
    NEW.user_id,
    'task_completed',
    'Tarefa concluída',
    COALESCE(v_completer_name, 'Alguém') || ' concluiu: ' || COALESCE(NEW.title, 'Sem título'),
    '/equipe?tab=tarefas&task=' || NEW.id::text,
    'tasks',
    NEW.id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_completed ON public.tasks;
CREATE TRIGGER trg_notify_task_completed
  AFTER UPDATE OF status ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_completed();
