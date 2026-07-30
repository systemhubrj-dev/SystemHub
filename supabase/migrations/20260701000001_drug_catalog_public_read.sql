-- Allow anonymous users to read all drug_catalog entries
-- This enables the community-driven bulário feature
CREATE POLICY "Anon public read drug catalog"
  ON public.drug_catalog FOR SELECT TO anon
  USING (true);
