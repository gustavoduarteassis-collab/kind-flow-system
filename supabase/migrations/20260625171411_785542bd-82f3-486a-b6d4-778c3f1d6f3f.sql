
-- 1) team_members: explicit SELECT restricted to authorized team / owner
DROP POLICY IF EXISTS "Authorized team can view team members" ON public.team_members;
CREATE POLICY "Authorized team can view team members"
  ON public.team_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_authorized_team(auth.uid()));

-- 2) stores: restrict SELECT (was USING true)
DROP POLICY IF EXISTS "All authenticated users can view stores" ON public.stores;
CREATE POLICY "Restricted store visibility"
  ON public.stores FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.is_authorized_team(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.franchisee_access fa
      WHERE fa.store_id = stores.id
        AND lower(fa.franchisee_email) = lower(auth.email())
    )
  );

-- 3) diary-photos storage INSERT: enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users upload diary photos" ON storage.objects;
CREATE POLICY "Users upload own diary photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'diary-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

-- 4) authorized_team_emails: break circular policy dependency
-- The SELECT policy called is_authorized_team() which queries this same table.
-- Replace with a direct email-based check that does NOT recurse through the function.
DROP POLICY IF EXISTS "Only team can view authorized emails" ON public.authorized_team_emails;
CREATE POLICY "Team members can view their own authorization row"
  ON public.authorized_team_emails FOR SELECT TO authenticated
  USING (lower(email) = lower(auth.email()));
