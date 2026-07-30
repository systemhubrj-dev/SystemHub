-- Platform admins can insert, update and delete drug_reference entries
CREATE POLICY "Platform admins can manage drug references"
  ON public.drug_reference FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
