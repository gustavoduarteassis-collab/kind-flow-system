
ALTER TABLE public.franchisee_access
ADD COLUMN can_view_checklist boolean NOT NULL DEFAULT true,
ADD COLUMN can_edit_checklist boolean NOT NULL DEFAULT false,
ADD COLUMN can_view_cronograma boolean NOT NULL DEFAULT true,
ADD COLUMN can_edit_cronograma boolean NOT NULL DEFAULT false,
ADD COLUMN can_view_diario boolean NOT NULL DEFAULT false,
ADD COLUMN can_view_custos boolean NOT NULL DEFAULT false;
