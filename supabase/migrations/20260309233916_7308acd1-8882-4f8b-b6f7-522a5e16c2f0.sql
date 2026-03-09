
ALTER TABLE public.franchisee_access
ADD COLUMN can_edit_diario boolean NOT NULL DEFAULT true,
ADD COLUMN can_edit_custos boolean NOT NULL DEFAULT true,
ADD COLUMN access_type text NOT NULL DEFAULT 'franqueado';
