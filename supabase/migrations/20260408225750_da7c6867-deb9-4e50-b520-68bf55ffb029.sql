
-- Add validation columns
ALTER TABLE public.drug_catalog 
  ADD COLUMN IF NOT EXISTS validation_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS validation_notes text;

-- Mark all existing entries as approved
UPDATE public.drug_catalog SET validation_status = 'approved' WHERE validation_status = 'pending';

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view drug catalog" ON public.drug_catalog;
DROP POLICY IF EXISTS "Users can insert own drugs" ON public.drug_catalog;
DROP POLICY IF EXISTS "Users can update own drugs" ON public.drug_catalog;
DROP POLICY IF EXISTS "Users can delete own drugs" ON public.drug_catalog;

-- SELECT: see approved + official + own (any status)
CREATE POLICY "View approved official or own drugs"
ON public.drug_catalog FOR SELECT TO authenticated
USING (
  validation_status = 'approved' 
  OR is_official = true 
  OR auth.uid() = user_id
);

-- INSERT: any authenticated, must set user_id = self, non-official
CREATE POLICY "Insert own drugs"
ON public.drug_catalog FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND is_official = false);

-- UPDATE: owner only, only pending/rejected entries, cannot set official
CREATE POLICY "Update own pending or rejected drugs"
ON public.drug_catalog FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND is_official = false AND validation_status IN ('pending', 'rejected'))
WITH CHECK (auth.uid() = user_id AND is_official = false);

-- DELETE: owner only, non-official
CREATE POLICY "Delete own non-official drugs"
ON public.drug_catalog FOR DELETE TO authenticated
USING (auth.uid() = user_id AND is_official = false);
