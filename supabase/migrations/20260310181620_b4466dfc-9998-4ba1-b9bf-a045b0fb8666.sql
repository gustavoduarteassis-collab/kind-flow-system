
-- Create storage bucket for inauguration checklist photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('inaug-checklist-photos', 'inaug-checklist-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload inaug photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'inaug-checklist-photos');

-- Allow authenticated users to view inaug photos
CREATE POLICY "Anyone can view inaug photos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'inaug-checklist-photos');

-- Allow authenticated users to delete their own inaug photos
CREATE POLICY "Authenticated users can delete inaug photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'inaug-checklist-photos');
