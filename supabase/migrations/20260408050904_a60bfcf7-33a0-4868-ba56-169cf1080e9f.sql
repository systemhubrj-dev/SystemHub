
-- Hospitalizations
CREATE TABLE public.hospitalizations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  reason text NOT NULL,
  vet_name text,
  admitted_at timestamp with time zone NOT NULL DEFAULT now(),
  discharged_at timestamp with time zone,
  status text NOT NULL DEFAULT 'active',
  severity text NOT NULL DEFAULT 'medium',
  discharge_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitalizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own hospitalizations" ON public.hospitalizations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hospitalizations" ON public.hospitalizations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hospitalizations" ON public.hospitalizations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hospitalizations" ON public.hospitalizations FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_hospitalizations_updated_at BEFORE UPDATE ON public.hospitalizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Hospitalization Evolutions (SOAP)
CREATE TABLE public.hospitalization_evolutions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hospitalization_id uuid REFERENCES public.hospitalizations(id) ON DELETE CASCADE NOT NULL,
  soap_type text NOT NULL DEFAULT 'subjective',
  content text,
  temperature numeric,
  heart_rate integer,
  respiratory_rate integer,
  pain_level integer,
  glycemia numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitalization_evolutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own evolutions" ON public.hospitalization_evolutions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own evolutions" ON public.hospitalization_evolutions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own evolutions" ON public.hospitalization_evolutions FOR DELETE USING (auth.uid() = user_id);

-- Hospitalization Medications
CREATE TABLE public.hospitalization_medications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hospitalization_id uuid REFERENCES public.hospitalizations(id) ON DELETE CASCADE NOT NULL,
  medication_name text NOT NULL,
  dosage text,
  frequency text,
  next_dose_at timestamp with time zone,
  administered boolean NOT NULL DEFAULT false,
  administered_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitalization_medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own hosp medications" ON public.hospitalization_medications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own hosp medications" ON public.hospitalization_medications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own hosp medications" ON public.hospitalization_medications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own hosp medications" ON public.hospitalization_medications FOR DELETE USING (auth.uid() = user_id);

-- Nursing Checks
CREATE TABLE public.nursing_checks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hospitalization_id uuid REFERENCES public.hospitalizations(id) ON DELETE CASCADE NOT NULL,
  check_type text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nursing_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own nursing checks" ON public.nursing_checks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nursing checks" ON public.nursing_checks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nursing checks" ON public.nursing_checks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nursing checks" ON public.nursing_checks FOR DELETE USING (auth.uid() = user_id);
