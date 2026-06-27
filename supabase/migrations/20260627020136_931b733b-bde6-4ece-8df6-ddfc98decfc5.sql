-- Restringir execução do soft_restore: somente equipe autorizada
REVOKE EXECUTE ON FUNCTION public.soft_restore(text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.soft_restore(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_authorized_team(auth.uid()) THEN
    RAISE EXCEPTION 'Não autorizado';
  END IF;
  IF _table NOT IN (
    'stores','pipeline_stores','tasks','team_members',
    'franchisee_access','habits','team_events','custos_geral_entries'
  ) THEN
    RAISE EXCEPTION 'Tabela % não suportada para restore', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    _table
  ) USING _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_restore(text, uuid) TO authenticated;
