
-- Add custos JSONB column to stores table
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS custos jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Create storage bucket for proposal attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to propostas bucket
CREATE POLICY "Authenticated users upload proposals"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'propostas');

-- Allow authenticated users to read proposals
CREATE POLICY "Authenticated users read proposals"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'propostas');

-- Allow users to delete their own proposals
CREATE POLICY "Users delete own proposals"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'propostas');
