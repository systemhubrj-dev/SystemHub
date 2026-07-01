-- Prevent authenticated users from inserting drug_catalog rows with is_official = true
-- The is_official flag must only be set by platform admins via service_role

-- Drop the existing INSERT policy that doesn't restrict is_official
DROP POLICY IF EXISTS "Users can insert own drugs" ON public.drug_catalog;

-- Re-create with WITH CHECK that forces is_official = false for user submissions
CREATE POLICY "Users can insert own drugs" ON public.drug_catalog
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND (is_official IS NULL OR is_official = false));

-- Also ensure users can only update their own non-official entries
DROP POLICY IF EXISTS "Users can update own drugs" ON public.drug_catalog;

CREATE POLICY "Users can update own drugs" ON public.drug_catalog
  FOR UPDATE
  USING (auth.uid() = user_id AND (is_official IS NULL OR is_official = false))
  WITH CHECK (auth.uid() = user_id AND (is_official IS NULL OR is_official = false));
