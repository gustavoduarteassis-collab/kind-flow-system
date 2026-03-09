
-- Drop existing restrictive policies on stores
DROP POLICY IF EXISTS "Team manages own stores" ON public.stores;
DROP POLICY IF EXISTS "Franchisees access their stores" ON public.stores;
DROP POLICY IF EXISTS "Franchisees update their stores" ON public.stores;

-- All authenticated users can view all stores
CREATE POLICY "All authenticated users can view stores"
ON public.stores FOR SELECT
TO authenticated
USING (true);

-- All authenticated users can insert stores
CREATE POLICY "All authenticated users can insert stores"
ON public.stores FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- All authenticated users can update any store
CREATE POLICY "All authenticated users can update stores"
ON public.stores FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- All authenticated users can delete their own stores
CREATE POLICY "All authenticated users can delete own stores"
ON public.stores FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also update construction_diary so everyone can see all entries
DROP POLICY IF EXISTS "Users manage own diary entries" ON public.construction_diary;

CREATE POLICY "All authenticated users can view diary"
ON public.construction_diary FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own diary entries"
ON public.construction_diary FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own diary entries"
ON public.construction_diary FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own diary entries"
ON public.construction_diary FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Also update diary_photos so everyone can see all photos
DROP POLICY IF EXISTS "Users manage own diary photos" ON public.diary_photos;

CREATE POLICY "All authenticated users can view diary photos"
ON public.diary_photos FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users manage own diary photos"
ON public.diary_photos FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM construction_diary
  WHERE construction_diary.id = diary_photos.diary_id
  AND construction_diary.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM construction_diary
  WHERE construction_diary.id = diary_photos.diary_id
  AND construction_diary.user_id = auth.uid()
));
