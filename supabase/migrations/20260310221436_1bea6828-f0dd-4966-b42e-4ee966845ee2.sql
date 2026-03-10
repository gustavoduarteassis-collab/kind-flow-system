
-- Fix franchisee_access RLS for authorized team
DROP POLICY IF EXISTS "Team manages franchisee access" ON public.franchisee_access;
CREATE POLICY "Authorized team manages franchisee access" ON public.franchisee_access
FOR ALL TO authenticated
USING (auth.uid() = created_by OR public.is_authorized_team(auth.uid()))
WITH CHECK (auth.uid() = created_by OR public.is_authorized_team(auth.uid()));

-- Fix stores INSERT to allow any authorized team member
DROP POLICY IF EXISTS "All authenticated users can insert stores" ON public.stores;
CREATE POLICY "Authorized team can insert stores" ON public.stores
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- Fix pipeline INSERT
DROP POLICY IF EXISTS "Users insert own pipeline stores" ON public.pipeline_stores;
CREATE POLICY "Authorized team can insert pipeline stores" ON public.pipeline_stores
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));
