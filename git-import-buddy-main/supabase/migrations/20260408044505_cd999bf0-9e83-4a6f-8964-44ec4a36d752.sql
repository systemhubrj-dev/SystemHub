
-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone TEXT,
  cpf TEXT,
  business_name TEXT,
  business_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cpf TEXT,
  address TEXT,
  notes TEXT,
  birth_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'scheduled',
  service TEXT,
  price NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own appointments" ON public.appointments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own appointments" ON public.appointments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own appointments" ON public.appointments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own appointments" ON public.appointments FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create financial records table
CREATE TABLE public.financial_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'income',
  amount NUMERIC(10,2) NOT NULL,
  description TEXT,
  category TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own records" ON public.financial_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON public.financial_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own records" ON public.financial_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own records" ON public.financial_records FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create pets table
CREATE TABLE public.pets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  species TEXT,
  breed TEXT,
  coat TEXT,
  color TEXT,
  sex TEXT,
  birth_date DATE,
  death_date DATE,
  neutered BOOLEAN DEFAULT false,
  microchip TEXT,
  restrictions TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pets" ON public.pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pets" ON public.pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON public.pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON public.pets FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create clinical records table
CREATE TABLE public.clinical_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  diagnosis TEXT,
  treatment TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own clinical_records" ON public.clinical_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clinical_records" ON public.clinical_records FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinical_records" ON public.clinical_records FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinical_records" ON public.clinical_records FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_clinical_records_updated_at BEFORE UPDATE ON public.clinical_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create pet exams table
CREATE TABLE public.pet_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  exam_type TEXT NOT NULL,
  result TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pet_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pet_exams" ON public.pet_exams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet_exams" ON public.pet_exams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pet_exams" ON public.pet_exams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pet_exams" ON public.pet_exams FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_exams_updated_at BEFORE UPDATE ON public.pet_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create pet vaccines table
CREATE TABLE public.pet_vaccines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  vaccine_name TEXT NOT NULL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  next_dose_date DATE,
  batch TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pet_vaccines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pet_vaccines" ON public.pet_vaccines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet_vaccines" ON public.pet_vaccines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pet_vaccines" ON public.pet_vaccines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pet_vaccines" ON public.pet_vaccines FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_vaccines_updated_at BEFORE UPDATE ON public.pet_vaccines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create pet notes table
CREATE TABLE public.pet_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pet_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pet_notes" ON public.pet_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet_notes" ON public.pet_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pet_notes" ON public.pet_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pet_notes" ON public.pet_notes FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_notes_updated_at BEFORE UPDATE ON public.pet_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create pet weights table
CREATE TABLE public.pet_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pet_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own pet_weights" ON public.pet_weights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pet_weights" ON public.pet_weights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own pet_weights" ON public.pet_weights FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_pet_weights_updated_at BEFORE UPDATE ON public.pet_weights FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create prescriptions table
CREATE TABLE public.prescriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  prescription TEXT NOT NULL,
  dosage TEXT,
  observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own prescriptions" ON public.prescriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own prescriptions" ON public.prescriptions FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create inventory items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'medication',
  unit TEXT NOT NULL DEFAULT 'un',
  quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  min_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  batch TEXT,
  expiry_date DATE,
  supplier TEXT,
  cost_price NUMERIC(10,2),
  sell_price NUMERIC(10,2),
  location TEXT,
  active_ingredient TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own inventory" ON public.inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON public.inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON public.inventory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON public.inventory_items FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON public.inventory_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create inventory movements table
CREATE TABLE public.inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  reason TEXT,
  reference_type TEXT,
  reference_id UUID,
  performed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own movements" ON public.inventory_movements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own movements" ON public.inventory_movements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create drug catalog table
CREATE TABLE public.drug_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  commercial_name TEXT,
  active_ingredient TEXT NOT NULL,
  drug_class TEXT,
  indications TEXT,
  species TEXT,
  dosage TEXT,
  contraindications TEXT,
  adverse_effects TEXT,
  interactions TEXT,
  withdrawal_period TEXT,
  is_official BOOLEAN NOT NULL DEFAULT false,
  source TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drug_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view drug catalog" ON public.drug_catalog FOR SELECT USING (true);
CREATE POLICY "Users can insert own drugs" ON public.drug_catalog FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own drugs" ON public.drug_catalog FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own drugs" ON public.drug_catalog FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_drug_catalog_updated_at BEFORE UPDATE ON public.drug_catalog FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_appointments_user_id ON public.appointments(user_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_client_id ON public.appointments(client_id);
CREATE INDEX idx_financial_records_user_id ON public.financial_records(user_id);
CREATE INDEX idx_financial_records_date ON public.financial_records(date);
CREATE INDEX idx_pets_user_id ON public.pets(user_id);
CREATE INDEX idx_pets_client_id ON public.pets(client_id);
CREATE INDEX idx_clinical_records_pet_id ON public.clinical_records(pet_id);
CREATE INDEX idx_pet_exams_pet_id ON public.pet_exams(pet_id);
CREATE INDEX idx_pet_vaccines_pet_id ON public.pet_vaccines(pet_id);
CREATE INDEX idx_inventory_items_user_id ON public.inventory_items(user_id);
