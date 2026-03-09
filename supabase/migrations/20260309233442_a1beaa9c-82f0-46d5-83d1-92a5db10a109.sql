
ALTER TABLE public.franchisee_access
ALTER COLUMN can_edit_checklist SET DEFAULT true,
ALTER COLUMN can_edit_cronograma SET DEFAULT true,
ALTER COLUMN can_view_diario SET DEFAULT true,
ALTER COLUMN can_view_custos SET DEFAULT true;
