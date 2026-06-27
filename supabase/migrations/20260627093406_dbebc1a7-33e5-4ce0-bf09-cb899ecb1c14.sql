
REVOKE EXECUTE ON FUNCTION public._create_auto_task(uuid, text, text, text, task_priority, int, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pipeline_auto_tasks() FROM PUBLIC, anon, authenticated;
