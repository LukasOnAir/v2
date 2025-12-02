-- Create storage bucket for test evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-evidence', 'test-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload evidence
CREATE POLICY "Authenticated users can upload evidence"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'test-evidence');

-- Allow anyone to view evidence (images embedded in test records)
CREATE POLICY "Anyone can view evidence"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'test-evidence');

-- Allow users to delete their own uploads (within same session)
CREATE POLICY "Users can delete own uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'test-evidence' AND auth.uid()::text = (storage.foldername(name))[1]);
