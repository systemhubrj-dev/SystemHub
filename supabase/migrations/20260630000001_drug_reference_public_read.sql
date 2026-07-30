-- Allow anonymous (unauthenticated) users to read the drug reference table
-- so the public Bulário page works without login.
CREATE POLICY "Public read access to drug references"
  ON public.drug_reference FOR SELECT TO anon
  USING (true);
