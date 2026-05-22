CREATE POLICY "Owner can view own clients"
  ON public.clients FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own clients"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own clients"
  ON public.clients FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own clients"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() = user_id);