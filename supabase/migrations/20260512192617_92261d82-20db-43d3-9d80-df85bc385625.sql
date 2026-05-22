-- Defense-in-depth: explicit owner CRUD policies

-- services
CREATE POLICY "Owners can select own services" ON public.services
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own services" ON public.services
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own services" ON public.services
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete own services" ON public.services
  FOR DELETE USING (auth.uid() = user_id);

-- pets
CREATE POLICY "Owners can select own pets" ON public.pets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own pets" ON public.pets
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own pets" ON public.pets
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete own pets" ON public.pets
  FOR DELETE USING (auth.uid() = user_id);

-- pet_exams
CREATE POLICY "Owners can select own pet_exams" ON public.pet_exams
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can insert own pet_exams" ON public.pet_exams
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can update own pet_exams" ON public.pet_exams
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners can delete own pet_exams" ON public.pet_exams
  FOR DELETE USING (auth.uid() = user_id);