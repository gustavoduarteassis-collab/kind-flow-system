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
    RETURN QUERY SELECT s.id, s.deleted_at, s.deleted_by, s.name::text FROM public.stores s WHERE s.deleted_at IS NOT NULL ORDER BY s.deleted_at DESC;
  ELSIF _table = 'pipeline_stores' THEN
    RETURN QUERY SELECT p.id, p.deleted_at, p.deleted_by, COALESCE(p.nome_loja, p.codigo_loja)::text FROM public.pipeline_stores p WHERE p.deleted_at IS NOT NULL ORDER BY p.deleted_at DESC;
  ELSIF _table = 'tasks' THEN
    RETURN QUERY SELECT t.id, t.deleted_at, t.deleted_by, t.title::text FROM public.tasks t WHERE t.deleted_at IS NOT NULL ORDER BY t.deleted_at DESC;
  ELSIF _table = 'team_members' THEN
    RETURN QUERY SELECT m.id, m.deleted_at, m.deleted_by, m.name::text FROM public.team_members m WHERE m.deleted_at IS NOT NULL ORDER BY m.deleted_at DESC;
  ELSIF _table = 'franchisee_access' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, f.email::text FROM public.franchisee_access f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'habits' THEN
    RETURN QUERY SELECT h.id, h.deleted_at, h.deleted_by, h.title::text FROM public.habits h WHERE h.deleted_at IS NOT NULL ORDER BY h.deleted_at DESC;
  ELSIF _table = 'team_events' THEN
    RETURN QUERY SELECT e.id, e.deleted_at, e.deleted_by, e.title::text FROM public.team_events e WHERE e.deleted_at IS NOT NULL ORDER BY e.deleted_at DESC;
  ELSIF _table = 'custos_geral_entries' THEN
    RETURN QUERY SELECT c.id, c.deleted_at, c.deleted_by, (c.categoria || ' - ' || COALESCE(c.descricao,''))::text FROM public.custos_geral_entries c WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC;
  ELSIF _table = 'fornecedores_homologados' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, COALESCE(f.razao_social, f.nome_fantasia, 'Fornecedor')::text FROM public.fornecedores_homologados f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'fornecedores_prospeccao' THEN
    RETURN QUERY SELECT f.id, f.deleted_at, f.deleted_by, COALESCE(f.nome_empresa, 'Prospecção')::text FROM public.fornecedores_prospeccao f WHERE f.deleted_at IS NOT NULL ORDER BY f.deleted_at DESC;
  ELSIF _table = 'construction_diary' THEN
    RETURN QUERY SELECT d.id, d.deleted_at, d.deleted_by, (COALESCE(d.entry_date::text,'') || ' - ' || COALESCE(d.store_name, ''))::text FROM public.construction_diary d WHERE d.deleted_at IS NOT NULL ORDER BY d.deleted_at DESC;
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
    RETURN QUERY SELECT c.id, c.deleted_at, c.deleted_by, LEFT(COALESCE(c.content, 'Comentário'), 80)::text FROM public.task_comments c WHERE c.deleted_at IS NOT NULL ORDER BY c.deleted_at DESC;
  ELSIF _table = 'habit_completions' THEN
    RETURN QUERY SELECT hc.id, hc.deleted_at, hc.deleted_by, hc.completion_date::text FROM public.habit_completions hc WHERE hc.deleted_at IS NOT NULL ORDER BY hc.deleted_at DESC;
  ELSE
    RAISE EXCEPTION 'Tabela % não suportada', _table;
  END IF;
END;
$function$;