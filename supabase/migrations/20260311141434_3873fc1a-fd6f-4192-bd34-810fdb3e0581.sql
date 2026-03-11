ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS visita_tecnica jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create storage bucket for visita tecnica photos
INSERT INTO storage.buckets (id, name, public) VALUES ('visita-tecnica-photos', 'visita-tecnica-photos', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for the bucket
CREATE POLICY "Anyone can view visita tecnica photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'visita-tecnica-photos');
CREATE POLICY "Authenticated users can upload visita tecnica photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'visita-tecnica-photos');
CREATE POLICY "Authenticated users can delete visita tecnica photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'visita-tecnica-photos');