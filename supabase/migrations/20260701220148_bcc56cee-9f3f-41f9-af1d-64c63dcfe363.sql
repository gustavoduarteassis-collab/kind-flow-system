
REVOKE EXECUTE ON FUNCTION public.is_authorized_team(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_actor_name() FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_soft_deleted(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.soft_restore(text, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_all_notifications_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public._create_auto_task(uuid, text, text, text, task_priority, integer, uuid, uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sync_auto_task(uuid, text, date, text, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_habit_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_store_status_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_activity() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_assigned() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pipeline_auto_tasks() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_activity_log_mutation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_log_mutation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_version_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
