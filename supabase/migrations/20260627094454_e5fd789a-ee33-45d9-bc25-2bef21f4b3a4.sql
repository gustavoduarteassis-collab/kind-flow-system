
CREATE OR REPLACE FUNCTION public._sync_auto_task(
  _store_id uuid, _phase text, _new_due date, _loja text, _reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_marker text := '[auto:' || _store_id::text || ':' || _phase || ']';
  v_task RECORD;
  v_new_priority task_priority;
  v_days int;
BEGIN
  SELECT * INTO v_task FROM public.tasks
   WHERE observacoes LIKE '%' || v_marker || '%'
     AND deleted_at IS NULL
     AND status <> 'concluida'::task_status
     AND status <> 'cancelada'::task_status
   ORDER BY created_at DESC LIMIT 1;

  IF v_task.id IS NULL THEN RETURN; END IF;

  v_days := (_new_due - CURRENT_DATE);
  v_new_priority := CASE
    WHEN v_days <= 3 THEN 'urgente'::task_priority
    WHEN v_days <= 7 THEN 'alta'::task_priority
    WHEN v_days <= 14 THEN 'media'::task_priority
    ELSE 'baixa'::task_priority
  END;

  UPDATE public.tasks
     SET due_date = _new_due,
         priority = v_new_priority,
         observacoes = COALESCE(v_task.observacoes,'') ||
           E'\n[auto-sync ' || to_char(now(),'YYYY-MM-DD HH24:MI') || '] ' ||
           _reason || ' → novo vencimento ' || _new_due::text ||
           ' (prioridade ' || v_new_priority::text || ')',
         updated_at = now()
   WHERE id = v_task.id;

  IF v_task.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, related_table, related_id)
    SELECT tm.user_id, 'task_updated',
           'Tarefa automática atualizada',
           v_task.title || ' — ' || _reason || ' (novo vencimento ' || _new_due::text || ')',
           '/equipe?tab=tarefas&task=' || v_task.id::text,
           'tasks', v_task.id
      FROM public.team_members tm
     WHERE tm.id = v_task.assigned_to AND tm.user_id IS NOT NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.pipeline_auto_tasks()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_member_id uuid;
  v_member_user uuid;
  v_creator uuid;
  v_loja text;
BEGIN
  IF NEW.analista_obra IS NULL OR btrim(NEW.analista_obra) = '' THEN
    RETURN NEW;
  END IF;

  SELECT id, user_id INTO v_member_id, v_member_user
  FROM public.team_members
  WHERE deleted_at IS NULL
    AND lower(btrim(name)) = lower(btrim(NEW.analista_obra))
  LIMIT 1;

  IF v_member_id IS NULL THEN RETURN NEW; END IF;

  v_creator := COALESCE(v_member_user, NEW.user_id);
  v_loja := COALESCE(NULLIF(btrim(NEW.local), ''), NULLIF(btrim(NEW.filial), ''), 'Loja');

  IF TG_OP = 'INSERT' THEN
    PERFORM public._create_auto_task(NEW.id, 'preobra',
      'Iniciar pré-obra',
      'Loja recém-criada no funil. Abrir levantamento técnico, definir construtor e mapear projetos necessários.',
      'alta'::task_priority, 3, v_member_id, v_creator, v_loja);
  END IF;

  -- inicio_obra: criar ou ressincronizar
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.inicio_obra,'') <> '')
     OR (TG_OP = 'UPDATE' AND COALESCE(OLD.inicio_obra,'') = '' AND COALESCE(NEW.inicio_obra,'') <> '') THEN
    PERFORM public._create_auto_task(NEW.id, 'obra_checklist',
      'Atualizar checklist de obra semanalmente',
      'Obra iniciada em ' || NEW.inicio_obra || '. Manter checklist atualizado toda segunda-feira.',
      'alta'::task_priority, 7, v_member_id, v_creator, v_loja);
    PERFORM public._create_auto_task(NEW.id, 'obra_diario',
      'Registrar diário de obra',
      'Registrar avanços, pendências e próximas etapas no diário da loja.',
      'media'::task_priority, 2, v_member_id, v_creator, v_loja);
  ELSIF TG_OP = 'UPDATE'
        AND COALESCE(OLD.inicio_obra,'') <> COALESCE(NEW.inicio_obra,'')
        AND COALESCE(NEW.inicio_obra,'') <> '' THEN
    BEGIN
      PERFORM public._sync_auto_task(NEW.id, 'obra_checklist', (NEW.inicio_obra::date + 7),
        v_loja, 'Início de obra alterado para ' || NEW.inicio_obra);
      PERFORM public._sync_auto_task(NEW.id, 'obra_diario', (NEW.inicio_obra::date + 2),
        v_loja, 'Início de obra alterado para ' || NEW.inicio_obra);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  -- previsao_inauguracao: criar ou ressincronizar
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.previsao_inauguracao,'') <> '')
     OR (TG_OP = 'UPDATE' AND COALESCE(OLD.previsao_inauguracao,'') = '' AND COALESCE(NEW.previsao_inauguracao,'') <> '') THEN
    PERFORM public._create_auto_task(NEW.id, 'checklist_final',
      'Preparar checklist final de inauguração',
      'Previsão: ' || NEW.previsao_inauguracao || '. Iniciar checklist final e revisar 10 solicitações operacionais.',
      'alta'::task_priority, 5, v_member_id, v_creator, v_loja);
  ELSIF TG_OP = 'UPDATE'
        AND COALESCE(OLD.previsao_inauguracao,'') <> COALESCE(NEW.previsao_inauguracao,'')
        AND COALESCE(NEW.previsao_inauguracao,'') <> '' THEN
    BEGIN
      PERFORM public._sync_auto_task(NEW.id, 'checklist_final',
        GREATEST(CURRENT_DATE + 1, (NEW.previsao_inauguracao::date - 5)),
        v_loja, 'Previsão de inauguração alterada para ' || NEW.previsao_inauguracao);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;

  IF (TG_OP = 'UPDATE'
      AND COALESCE(NEW.status_geral,'') ILIKE 'Inaugurada%'
      AND COALESCE(OLD.status_geral,'') NOT ILIKE 'Inaugurada%') THEN
    PERFORM public._create_auto_task(NEW.id, 'inaugurada_custos',
      'Lançar custos finais da obra',
      'Loja inaugurada. Registrar custos finais em Custos Geral e fechar checklist.',
      'urgente'::task_priority, 7, v_member_id, v_creator, v_loja);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public._sync_auto_task(uuid, text, date, text, text) FROM PUBLIC, anon, authenticated;
