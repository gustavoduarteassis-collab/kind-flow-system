
DO $$ BEGIN CREATE TYPE public.task_type AS ENUM ('geral','loja','habito');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.task_recurrence AS ENUM ('nao','diaria','semanal','mensal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS task_type public.task_type NOT NULL DEFAULT 'geral',
  ADD COLUMN IF NOT EXISTS store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recurrence public.task_recurrence NOT NULL DEFAULT 'nao',
  ADD COLUMN IF NOT EXISTS subtasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid,
  ADD COLUMN IF NOT EXISTS observacoes text;

CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON public.tasks(archived_at) WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_store_id ON public.tasks(store_id) WHERE store_id IS NOT NULL;

ALTER TABLE public.habit_completions ADD COLUMN IF NOT EXISTS note text;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  actor_name text,
  action_type text NOT NULL,
  description text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON public.activity_log(entity_type, entity_id);

GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT ALL ON public.activity_log TO service_role;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_log_select_authorized" ON public.activity_log
  FOR SELECT TO authenticated
  USING (public.is_authorized_team(auth.uid()) OR user_id = auth.uid());

CREATE POLICY "activity_log_insert_self" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

CREATE OR REPLACE FUNCTION public.prevent_activity_log_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'activity_log é append-only'; END;
$$;

DROP TRIGGER IF EXISTS trg_activity_log_no_update ON public.activity_log;
CREATE TRIGGER trg_activity_log_no_update
  BEFORE UPDATE OR DELETE ON public.activity_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_mutation();

CREATE TABLE IF NOT EXISTS public.task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid,
  actor_name text,
  message text NOT NULL,
  kind text NOT NULL DEFAULT 'comentario',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_task_updates_task ON public.task_updates(task_id, created_at DESC);

GRANT SELECT, INSERT ON public.task_updates TO authenticated;
GRANT ALL ON public.task_updates TO service_role;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_updates_select_all_auth" ON public.task_updates
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_updates_insert_auth" ON public.task_updates
  FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid() OR public.is_authorized_team(auth.uid()));

DROP TRIGGER IF EXISTS trg_task_updates_no_mutation ON public.task_updates;
CREATE TRIGGER trg_task_updates_no_mutation
  BEFORE UPDATE OR DELETE ON public.task_updates
  FOR EACH ROW EXECUTE FUNCTION public.prevent_activity_log_mutation();

CREATE OR REPLACE FUNCTION public.current_actor_name()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT name FROM public.team_members WHERE user_id = auth.uid() LIMIT 1),
    (SELECT email FROM auth.users WHERE id = auth.uid())
  );
$$;

CREATE OR REPLACE FUNCTION public.log_task_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor text := public.current_actor_name();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
    VALUES (auth.uid(), v_actor, 'task_created',
            COALESCE(v_actor,'Alguém') || ' criou tarefa "' || NEW.title || '"', 'task', NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status::text = 'concluida' AND OLD.status::text <> 'concluida' THEN
      INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
      VALUES (auth.uid(), v_actor, 'task_completed',
              COALESCE(v_actor,'Alguém') || ' concluiu tarefa "' || NEW.title || '"', 'task', NEW.id);
    END IF;
    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
      VALUES (auth.uid(), v_actor, 'task_archived',
              COALESCE(v_actor,'Alguém') || ' arquivou tarefa "' || NEW.title || '"', 'task', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_task_activity ON public.tasks;
CREATE TRIGGER trg_log_task_activity
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.log_task_activity();

CREATE OR REPLACE FUNCTION public.log_habit_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor text := public.current_actor_name();
  v_habit text;
BEGIN
  IF NEW.completed IS TRUE AND (TG_OP = 'INSERT' OR OLD.completed IS DISTINCT FROM NEW.completed) THEN
    SELECT title INTO v_habit FROM public.habits WHERE id = NEW.habit_id;
    INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id, metadata)
    VALUES (auth.uid(), v_actor, 'habit_completed',
            COALESCE(v_actor,'Alguém') || ' concluiu hábito "' || COALESCE(v_habit,'?') || '"',
            'habit', NEW.habit_id,
            jsonb_build_object('date', NEW.completion_date, 'note', NEW.note));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_habit_activity ON public.habit_completions;
CREATE TRIGGER trg_log_habit_activity
  AFTER INSERT OR UPDATE ON public.habit_completions
  FOR EACH ROW EXECUTE FUNCTION public.log_habit_activity();

CREATE OR REPLACE FUNCTION public.log_store_status_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_actor text := public.current_actor_name();
BEGIN
  IF NEW.status_geral IS DISTINCT FROM OLD.status_geral THEN
    INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id, metadata)
    VALUES (auth.uid(), v_actor, 'store_status_changed',
            COALESCE(v_actor,'Alguém') || ' atualizou status da loja "' || COALESCE(NEW.nome,'?') || '" para "' || COALESCE(NEW.status_geral::text,'?') || '"',
            'store', NEW.id,
            jsonb_build_object('from', OLD.status_geral, 'to', NEW.status_geral));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_store_status_activity ON public.stores;
CREATE TRIGGER trg_log_store_status_activity
  AFTER UPDATE OF status_geral ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.log_store_status_activity();

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.task_updates;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
