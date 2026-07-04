
-- ============================================================
-- FIX #4 — list_soft_deleted: corrigir colunas inexistentes
-- ============================================================
CREATE OR REPLACE FUNCTION public.list_soft_deleted(_table text)
 RETURNS TABLE(id uuid, deleted_at timestamp with time zone, deleted_by uuid, label text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_authorized_team(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  IF _table = 'stores' THEN
    RETURN QUERY SELECT s.id, s.deleted_at, s.deleted_by, s.nome::text FROM public.stores s WHERE s.deleted_at IS NOT NULL ORDER BY s.deleted_at DESC;
  ELSIF _table = 'pipeline_stores' THEN
    RETURN QUERY SELECT p.id, p.deleted_at, p.deleted_by, COALESCE(NULLIF(btrim(p.local),''), NULLIF(btrim(p.filial),''), '(sem nome)')::text FROM public.pipeline_stores p WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC;
  ELSIF _table = 'tasks' THEN
    RETURN QUERY SELECT t.id, t.deleted_at, t.deleted_by, t.title::text FROM public.tasks t WHERE t.deleted_at IS NOT NULL ORDER BY t.deleted_at DESC;
  ELSIF _table = 'team_members' THEN
    RETURN QUERY SELECT m.id, m.deleted_at, m.deleted_by, m.name::text FROM public.team_members m WHERE m.deleted_at IS NOT NULL ORDER BY m.deleted_at DESC;
  ELSIF _table = 'franchisee_access' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, f.franchisee_email::text FROM public.franchisee_access f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'habits' THEN
    RETURN QUERY SELECT h.id, h.deleted_at, h.deleted_by, h.title::text FROM public.habits h WHERE h.deleted_at IS NOT NULL ORDER BY h.deleted_at DESC;
  ELSIF _table = 'team_events' THEN
    RETURN QUERY SELECT e.id, e.deleted_at, e.deleted_by, e.title::text FROM public.team_events e WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC;
  ELSIF _table = 'custos_geral_entries' THEN
    RETURN QUERY SELECT c.id, c.deleted_at, c.deleted_by, (COALESCE(c.nome,'') || ' (' || COALESCE(c.ano::text,'') || ')')::text FROM public.custos_geral_entries c WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC;
  ELSIF _table = 'fornecedores_homologados' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, COALESCE(f.razao_social, f.nome_fantasia, 'Fornecedor')::text FROM public.fornecedores_homologados f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'fornecedores_prospeccao' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, COALESCE(f.nome_empresa, 'Prospecção')::text FROM public.fornecedores_prospeccao f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'construction_diary' THEN
    RETURN QUERY SELECT d.id, d.deleted_at, d.deleted_by, (COALESCE(d.entry_date::text,'') || ' - ' || COALESCE(d.store_name,''))::text FROM public.construction_diary d WHERE d.deleted_at IS NOT NULL ORDER BY d.deleted_at DESC;
  ELSIF _table = 'diary_photos' THEN
    RETURN QUERY SELECT p.id, p.deleted_at, p.deleted_by, COALESCE(p.caption, p.file_name, 'Foto')::text FROM public.diary_photos p WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC;
  ELSIF _table = 'agm_planos_acao' THEN
    RETURN QUERY SELECT a.id, a.deleted_at, a.deleted_by, COALESCE(a.titulo, a.descricao, 'Plano AGM')::text FROM public.agm_planos_acao a WHERE a.deleted_at IS NOT NULL ORDER BY a.deleted_at DESC;
  ELSIF _table = 'agm_action_plans' THEN
    RETURN QUERY SELECT a.id, a.deleted_at, a.deleted_by, COALESCE(a.titulo, a.descricao, 'Plano AGM')::text FROM public.agm_action_plans a WHERE a.deleted_at IS NOT NULL ORDER BY a.deleted_at DESC;
  ELSIF _table = 'agm_entries' THEN
    RETURN QUERY SELECT a.id, a.deleted_at, a.deleted_by, COALESCE(a.mes_referencia::text, 'AGM')::text FROM public.agm_entries a WHERE a.deleted_at IS NOT NULL ORDER BY a.deleted_at DESC;
  ELSIF _table = 'analyst_goals' THEN
    RETURN QUERY SELECT g.id, g.deleted_at, g.deleted_by, COALESCE(g.nome, 'Meta')::text FROM public.analyst_goals g WHERE g.deleted_at IS NOT NULL ORDER BY g.deleted_at DESC;
  ELSIF _table = 'task_comments' THEN
    RETURN QUERY SELECT c.id, c.deleted_at, c.deleted_by, LEFT(COALESCE(c.content,'Comentário'), 80)::text FROM public.task_comments c WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC;
  ELSIF _table = 'habit_completions' THEN
    RETURN QUERY SELECT hc.id, hc.deleted_at, hc.deleted_by, hc.completion_date::text FROM public.habit_completions hc WHERE hc.deleted_at IS NOT NULL ORDER BY hc.deleted_at DESC;
  ELSE
    RAISE EXCEPTION 'Tabela % não suportada', _table;
  END IF;
END;
$function$;

-- ============================================================
-- FIX #6 — Notificações duplicadas: limpar histórico + prevenir
-- ============================================================
-- Mantém a mais recente de cada (user_id, type, title, related_id) não-lida.
WITH dupes AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, type, title, COALESCE(related_id::text, '-'), COALESCE(related_table,'-')
           ORDER BY created_at DESC
         ) AS rn
  FROM public.notifications
  WHERE deleted_at IS NULL
)
UPDATE public.notifications n
   SET deleted_at = now()
  FROM dupes d
 WHERE n.id = d.id AND d.rn > 1;

-- Índice único parcial: impede novas duplicatas ativas.
CREATE UNIQUE INDEX IF NOT EXISTS notifications_uniq_active
  ON public.notifications (user_id, type, title, COALESCE(related_table,''), COALESCE(related_id::text,''))
  WHERE deleted_at IS NULL AND read_at IS NULL;

-- ============================================================
-- FIX #10 — activity_log: nunca "Alguém" quando dá pra resolver
-- ============================================================
CREATE OR REPLACE FUNCTION public.log_task_activity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor text;
BEGIN
  v_actor := public.current_actor_name();
  IF v_actor IS NULL OR btrim(v_actor) = '' THEN
    SELECT name INTO v_actor FROM public.team_members
      WHERE user_id = NEW.user_id AND deleted_at IS NULL LIMIT 1;
  END IF;
  v_actor := COALESCE(NULLIF(btrim(v_actor),''), 'Sistema');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
    VALUES (auth.uid(), v_actor, 'task_created',
            v_actor || ' criou tarefa "' || NEW.title || '"', 'task', NEW.id);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status::text = 'concluida' AND OLD.status::text <> 'concluida' THEN
      INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
      VALUES (auth.uid(), v_actor, 'task_completed',
              v_actor || ' concluiu tarefa "' || NEW.title || '"', 'task', NEW.id);
    END IF;
    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      INSERT INTO public.activity_log(user_id, actor_name, action_type, description, entity_type, entity_id)
      VALUES (auth.uid(), v_actor, 'task_archived',
              v_actor || ' arquivou tarefa "' || NEW.title || '"', 'task', NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Preencher histórico onde actor_name veio "Alguém" ou NULL, se dá pra resolver por user_id.
UPDATE public.activity_log al
   SET actor_name = tm.name,
       description = REPLACE(al.description, 'Alguém', tm.name)
  FROM public.team_members tm
 WHERE (al.actor_name IS NULL OR al.actor_name = 'Alguém' OR btrim(al.actor_name) = '')
   AND al.user_id IS NOT NULL
   AND tm.user_id = al.user_id
   AND tm.deleted_at IS NULL;

-- ============================================================
-- FIX #1 — Validar formato de data no Funil e sincronizar Painel
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_pipeline_date_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  re text := '^\s*(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4})\s*$';
BEGIN
  IF NEW.previsao_inauguracao IS NOT NULL AND btrim(NEW.previsao_inauguracao) <> '' THEN
    IF NEW.previsao_inauguracao !~ re THEN
      RAISE EXCEPTION 'Formato inválido para previsao_inauguracao: "%". Use DD/MM/AAAA ou AAAA-MM-DD (um valor apenas).', NEW.previsao_inauguracao;
    END IF;
    NEW.previsao_inauguracao := btrim(NEW.previsao_inauguracao);
  END IF;
  IF NEW.data_inauguracao IS NOT NULL AND btrim(NEW.data_inauguracao) <> '' THEN
    IF NEW.data_inauguracao !~ re THEN
      RAISE EXCEPTION 'Formato inválido para data_inauguracao: "%". Use DD/MM/AAAA ou AAAA-MM-DD (um valor apenas).', NEW.data_inauguracao;
    END IF;
    NEW.data_inauguracao := btrim(NEW.data_inauguracao);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS validate_pipeline_dates ON public.pipeline_stores;
CREATE TRIGGER validate_pipeline_dates
BEFORE INSERT OR UPDATE OF previsao_inauguracao, data_inauguracao ON public.pipeline_stores
FOR EACH ROW EXECUTE FUNCTION public.validate_pipeline_date_fields();

-- Sincroniza pipeline_stores -> stores (Painel) por filial/local match.
CREATE OR REPLACE FUNCTION public.sync_pipeline_dates_to_stores()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_norm_local text;
  v_norm_filial text;
  v_target_id uuid;
  v_iso_real date;
BEGIN
  IF (COALESCE(NEW.previsao_inauguracao,'') = COALESCE(OLD.previsao_inauguracao,''))
     AND (COALESCE(NEW.data_inauguracao,'') = COALESCE(OLD.data_inauguracao,'')) THEN
    RETURN NEW;
  END IF;

  v_norm_local := lower(btrim(COALESCE(NEW.local,'')));
  v_norm_filial := lower(btrim(COALESCE(NEW.filial,'')));

  SELECT id INTO v_target_id FROM public.stores
   WHERE deleted_at IS NULL
     AND (
       (v_norm_filial <> '' AND lower(btrim(COALESCE(filial,''))) = v_norm_filial)
       OR (v_norm_local <> '' AND lower(btrim(COALESCE(nome,''))) = v_norm_local)
     )
   LIMIT 1;

  IF v_target_id IS NULL THEN RETURN NEW; END IF;

  -- previsao: campo texto no painel também
  IF COALESCE(NEW.previsao_inauguracao,'') <> COALESCE(OLD.previsao_inauguracao,'') THEN
    UPDATE public.stores SET inauguracao = NEW.previsao_inauguracao WHERE id = v_target_id;
  END IF;

  -- data_inauguracao: converte para date e grava em inauguracao_real
  IF COALESCE(NEW.data_inauguracao,'') <> COALESCE(OLD.data_inauguracao,'') THEN
    v_iso_real := NULL;
    BEGIN
      IF NEW.data_inauguracao ~ '^\d{4}-\d{2}-\d{2}$' THEN
        v_iso_real := NEW.data_inauguracao::date;
      ELSIF NEW.data_inauguracao ~ '^\d{1,2}/\d{1,2}/\d{4}$' THEN
        v_iso_real := to_date(NEW.data_inauguracao, 'DD/MM/YYYY');
      ELSIF NEW.data_inauguracao ~ '^\d{1,2}/\d{1,2}/\d{2}$' THEN
        v_iso_real := to_date(NEW.data_inauguracao, 'DD/MM/YY');
      END IF;
    EXCEPTION WHEN others THEN v_iso_real := NULL; END;
    IF v_iso_real IS NOT NULL THEN
      UPDATE public.stores SET inauguracao_real = v_iso_real WHERE id = v_target_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS sync_pipeline_dates ON public.pipeline_stores;
CREATE TRIGGER sync_pipeline_dates
AFTER INSERT OR UPDATE OF previsao_inauguracao, data_inauguracao ON public.pipeline_stores
FOR EACH ROW EXECUTE FUNCTION public.sync_pipeline_dates_to_stores();
