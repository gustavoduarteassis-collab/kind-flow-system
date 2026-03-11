
-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Authorized team manages franchisee access" ON public.franchisee_access;

-- Create new policy: all authorized team members can manage franchisee access
CREATE POLICY "Authorized team manages franchisee access"
ON public.franchisee_access
FOR ALL
TO authenticated
USING (is_authorized_team(auth.uid()))
WITH CHECK (is_authorized_team(auth.uid()));
