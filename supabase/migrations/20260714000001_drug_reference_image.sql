-- Add image_url column to drug_reference
ALTER TABLE public.drug_reference ADD COLUMN IF NOT EXISTS image_url text;

-- Create public bucket for drug images (5 MB max, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'drug-images',
  'drug-images',
  true,
  5242880,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view drug images (public bucket)
CREATE POLICY "Public read drug images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'drug-images');

-- Platform admins can upload drug images
CREATE POLICY "Platform admins upload drug images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'drug-images'
    AND EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- Platform admins can replace/update drug images
CREATE POLICY "Platform admins update drug images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'drug-images'
    AND EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );

-- Platform admins can delete drug images
CREATE POLICY "Platform admins delete drug images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'drug-images'
    AND EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
