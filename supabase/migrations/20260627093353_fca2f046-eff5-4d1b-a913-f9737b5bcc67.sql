
CREATE OR REPLACE FUNCTION public._create_auto_task(
  _store_id uuid, _phase text, _title text, _desc text,
  _priority task_priority, _due_offset int,
  _assigned_to uuid, _creator uuid, _loja text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_marker text;
BEGIN
  v_marker := '[auto:' || _store_id::text || ':' || _phase || ']';
  IF EXISTS (
    SELECT 1 FROM public.tasks
    WHERE observacoes LIKE '%' || v_marker || '%' AND deleted_at IS NULL
  ) THEN RETURN; END IF;

  INSERT INTO public.tasks (
    user_id, title, description, status, priority, assigned_to,
    due_date, task_type, observacoes
  )
  VALUES (
    _creator,
    _title || ' — ' || _loja,
    _desc,
    'pendente'::task_status,
    _priority,
    _assigned_to,
    (CURRENT_DATE + _due_offset)::date,
    'loja'::task_type,
    v_marker
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.pipeline_auto_tasks()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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

  -- Fase 1: criação no funil
  IF TG_OP = 'INSERT' THEN
    PERFORM public._create_auto_task(NEW.id, 'preobra',
      'Iniciar pré-obra',
      'Loja recém-criada no funil. Abrir levantamento técnico, definir construtor e mapear projetos necessários.',
      'alta'::task_priority, 3, v_member_id, v_creator, v_loja);
  END IF;

  -- Fase 2: início de obra preenchido
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
  END IF;

  -- Fase 3: previsão de inauguração definida
  IF (TG_OP = 'INSERT' AND COALESCE(NEW.previsao_inauguracao,'') <> '')
     OR (TG_OP = 'UPDATE' AND COALESCE(OLD.previsao_inauguracao,'') = '' AND COALESCE(NEW.previsao_inauguracao,'') <> '') THEN
    PERFORM public._create_auto_task(NEW.id, 'checklist_final',
      'Preparar checklist final de inauguração',
      'Previsão: ' || NEW.previsao_inauguracao || '. Iniciar checklist final e revisar 10 solicitações operacionais.',
      'alta'::task_priority, 5, v_member_id, v_creator, v_loja);
  END IF;

  -- Fase 4: marcada como inaugurada
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

DROP TRIGGER IF EXISTS trg_pipeline_auto_tasks ON public.pipeline_stores;
CREATE TRIGGER trg_pipeline_auto_tasks
AFTER INSERT OR UPDATE ON public.pipeline_stores
FOR EACH ROW
WHEN (NEW.deleted_at IS NULL)
EXECUTE FUNCTION public.pipeline_auto_tasks();
