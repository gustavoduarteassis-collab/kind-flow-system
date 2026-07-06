-- ============================================================
-- Segurança: fechar RLS aberto e revogar EXECUTE de funções internas
-- ============================================================

-- 1) pendencias — restringir SELECT ao time autorizado
DROP POLICY IF EXISTS "Autenticados podem ler pendencias" ON public.pendencias;
CREATE POLICY "Time autorizado pode ler pendencias"
  ON public.pendencias
  FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()));

-- 2) store_updates — restringir SELECT ao time autorizado
DROP POLICY IF EXISTS "Auth can view store updates" ON public.store_updates;
CREATE POLICY "Time autorizado pode ler store updates"
  ON public.store_updates
  FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()) AND deleted_at IS NULL);

-- 3) store_updates — INSERT precisa ser do time e vincular autor à sessão
DROP POLICY IF EXISTS "Auth can insert store updates" ON public.store_updates;
CREATE POLICY "Time autorizado pode inserir store updates"
  ON public.store_updates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_authorized_team(auth.uid())
    AND autor_user_id = auth.uid()
  );

-- 4) Revogar EXECUTE das funções internas (trigger/helpers).
-- Triggers rodam sob o owner da tabela, então revogar EXECUTE do público
-- não quebra os triggers — só impede chamadas diretas via API.
REVOKE EXECUTE ON FUNCTION public._create_auto_task(uuid, text, text, text, task_priority, integer, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public._sync_auto_task(uuid, text, date, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_habit_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_store_status_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_task_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_assigned() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_task_completed() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.pipeline_auto_tasks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_store_ultima_atualizacao() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_pipeline_dates_to_stores() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_version_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_activity_log_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_log_mutation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_pipeline_date_fields() FROM PUBLIC, anon, authenticated;

-- 5) can_edit_pendencia está com anon EXECUTE — desnecessário; políticas
-- que chamam a função são avaliadas como o próprio role (authenticated).
REVOKE EXECUTE ON FUNCTION public.can_edit_pendencia(text) FROM PUBLIC, anon;