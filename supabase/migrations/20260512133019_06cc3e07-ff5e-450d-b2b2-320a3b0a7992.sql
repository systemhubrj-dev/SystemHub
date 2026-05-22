
-- Adiciona coluna 'vertical' em profiles para suportar multi-vertical (Vet/Nutri/...).
-- Default 'vet' garante que todas as contas existentes continuem como SystemHub Vet.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vertical text NOT NULL DEFAULT 'vet';

-- Restringe os valores aceitos via trigger (não usamos CHECK pra ficar fácil de evoluir).
CREATE OR REPLACE FUNCTION public.validate_profile_vertical()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.vertical NOT IN ('vet','nutri','estetica','psi','barber') THEN
    RAISE EXCEPTION 'Vertical inválida: %', NEW.vertical;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_vertical_trg ON public.profiles;
CREATE TRIGGER validate_profile_vertical_trg
BEFORE INSERT OR UPDATE OF vertical ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_vertical();

-- handle_new_user agora propaga a vertical escolhida no signup (via raw_user_meta_data.vertical).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, vertical)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'vertical',''), 'vet')
  );
  RETURN NEW;
END;
$$;

-- ===== Tabelas Nutri =====
CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid,
  name text NOT NULL,
  birth_date date,
  sex text,
  goal text,
  dietary_restrictions text,
  allergies text,
  medical_conditions text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view patients" ON public.patients FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert patients" ON public.patients FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update patients" ON public.patients FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete patients" ON public.patients FOR DELETE USING (public.is_team_member(user_id));
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.patient_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  height_cm numeric,
  bmi numeric,
  body_fat_percent numeric,
  lean_mass_kg numeric,
  measurements jsonb NOT NULL DEFAULT '{}'::jsonb,
  bioimpedance jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.patient_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view patient_assessments" ON public.patient_assessments FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert patient_assessments" ON public.patient_assessments FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update patient_assessments" ON public.patient_assessments FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete patient_assessments" ON public.patient_assessments FOR DELETE USING (public.is_team_member(user_id));
CREATE TRIGGER update_patient_assessments_updated_at BEFORE UPDATE ON public.patient_assessments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  title text NOT NULL,
  start_date date,
  end_date date,
  total_kcal numeric,
  total_protein_g numeric,
  total_carb_g numeric,
  total_fat_g numeric,
  notes text,
  generated_by_ai boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view meal_plans" ON public.meal_plans FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert meal_plans" ON public.meal_plans FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update meal_plans" ON public.meal_plans FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete meal_plans" ON public.meal_plans FOR DELETE USING (public.is_team_member(user_id));
CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON public.meal_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  meal_plan_id uuid NOT NULL REFERENCES public.meal_plans(id) ON DELETE CASCADE,
  meal_name text NOT NULL,
  meal_time text,
  food text NOT NULL,
  quantity text,
  kcal numeric,
  protein_g numeric,
  carb_g numeric,
  fat_g numeric,
  ord integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view meal_plan_items" ON public.meal_plan_items FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert meal_plan_items" ON public.meal_plan_items FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update meal_plan_items" ON public.meal_plan_items FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete meal_plan_items" ON public.meal_plan_items FOR DELETE USING (public.is_team_member(user_id));

CREATE TABLE IF NOT EXISTS public.nutri_anamnesis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  entry_date timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nutri_anamnesis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Team can view nutri_anamnesis" ON public.nutri_anamnesis FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert nutri_anamnesis" ON public.nutri_anamnesis FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update nutri_anamnesis" ON public.nutri_anamnesis FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete nutri_anamnesis" ON public.nutri_anamnesis FOR DELETE USING (public.is_team_member(user_id));
CREATE TRIGGER update_nutri_anamnesis_updated_at BEFORE UPDATE ON public.nutri_anamnesis FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_patients_user_id ON public.patients(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_assessments_patient ON public.patient_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_patient ON public.meal_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan ON public.meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_nutri_anamnesis_patient ON public.nutri_anamnesis(patient_id);
