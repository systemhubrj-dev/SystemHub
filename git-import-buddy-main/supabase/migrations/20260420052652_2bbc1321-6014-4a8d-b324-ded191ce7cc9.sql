-- Bucket público para logos de clínicas
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies (idempotentes)
DROP POLICY IF EXISTS "Anyone can view clinic logos" ON storage.objects;
CREATE POLICY "Anyone can view clinic logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'clinic-logos');

DROP POLICY IF EXISTS "Users can upload own clinic logo" ON storage.objects;
CREATE POLICY "Users can upload own clinic logo"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'clinic-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can update own clinic logo" ON storage.objects;
CREATE POLICY "Users can update own clinic logo"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'clinic-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "Users can delete own clinic logo" ON storage.objects;
CREATE POLICY "Users can delete own clinic logo"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'clinic-logos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Adiciona logo_url no profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS logo_url text;