
-- Trigger-only functions: nenhuma role precisa chamar diretamente
REVOKE EXECUTE ON FUNCTION public._create_auto_task(uuid, text, text, text, task_priority, integer, uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._sync_auto_task(uuid, text, date, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_habit_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_store_status_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_task_activity() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_task_assigned() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pipeline_auto_tasks() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_activity_log_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prevent_log_mutation() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bump_version_column() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC;

-- Funções chamadas pelo app (apenas authenticated)
REVOKE EXECUTE ON FUNCTION public.is_authorized_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_authorized_team(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_actor_name() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_actor_name() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.list_soft_deleted(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_soft_deleted(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.soft_restore(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_restore(text, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
