
-- 1. Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view drug catalog" ON public.drug_catalog;

-- 2. Create a new SELECT policy: authenticated users can see official entries + their own
CREATE POLICY "Authenticated users can view drug catalog"
ON public.drug_catalog
FOR SELECT
TO authenticated
USING (is_official = true OR auth.uid() = user_id);

-- 3. Drop and recreate UPDATE policy with WITH CHECK to prevent is_official escalation
DROP POLICY IF EXISTS "Users can update own drugs" ON public.drug_catalog;
CREATE POLICY "Users can update own drugs"
ON public.drug_catalog
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND is_official = false)
WITH CHECK (auth.uid() = user_id AND is_official = false);

-- 4. Drop and recreate INSERT policy with WITH CHECK to prevent inserting official entries
DROP POLICY IF EXISTS "Users can insert own drugs" ON public.drug_catalog;
CREATE POLICY "Users can insert own drugs"
ON public.drug_catalog
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND is_official = false);

-- 5. Restrict DELETE to own non-official entries
DROP POLICY IF EXISTS "Users can delete own drugs" ON public.drug_catalog;
CREATE POLICY "Users can delete own drugs"
ON public.drug_catalog
FOR DELETE
TO authenticated
USING (auth.uid() = user_id AND is_official = false);
