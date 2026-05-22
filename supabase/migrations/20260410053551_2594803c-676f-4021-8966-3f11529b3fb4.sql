
-- 1. Make exam-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'exam-files';

-- 2. Drop existing overly-permissive storage policies for exam-files
DROP POLICY IF EXISTS "Anyone can view exam files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own exam files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own exam files" ON storage.objects;

-- 3. Create owner-scoped storage policies
CREATE POLICY "Owners can view own exam files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'exam-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can upload own exam files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'exam-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update own exam files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'exam-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete own exam files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'exam-files' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Add missing UPDATE policy on hospitalization_evolutions
CREATE POLICY "Users can update own evolutions"
ON public.hospitalization_evolutions FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Restrict drug_reference_doses to authenticated users only
DROP POLICY IF EXISTS "Anyone can read drug reference doses" ON public.drug_reference_doses;
CREATE POLICY "Authenticated users can read drug reference doses"
ON public.drug_reference_doses FOR SELECT TO authenticated
USING (true);
