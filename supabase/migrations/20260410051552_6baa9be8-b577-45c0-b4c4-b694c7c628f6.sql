
-- 1. Clinical entries (prontuário completo)
CREATE TABLE public.clinical_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,

  -- Identificação do atendimento
  entry_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  vet_name TEXT,

  -- Queixa principal
  chief_complaint TEXT,
  complaint_tags TEXT[] DEFAULT '{}',

  -- Anamnese estruturada
  anamnesis JSONB DEFAULT '{}'::jsonb,

  -- Parâmetros vitais
  weight NUMERIC,
  temperature NUMERIC,
  heart_rate INTEGER,
  respiratory_rate INTEGER,
  capillary_refill_time TEXT,

  -- Exame físico
  physical_exam JSONB DEFAULT '{}'::jsonb,

  -- Diagnóstico
  diagnosis TEXT,
  differential_diagnosis TEXT,

  -- Prognóstico
  prognosis TEXT,
  prognosis_notes TEXT,

  -- Observações gerais
  general_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clinical entries"
  ON public.clinical_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own clinical entries"
  ON public.clinical_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own clinical entries"
  ON public.clinical_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own clinical entries"
  ON public.clinical_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_clinical_entries_pet ON public.clinical_entries(pet_id);
CREATE INDEX idx_clinical_entries_user ON public.clinical_entries(user_id);

CREATE TRIGGER update_clinical_entries_updated_at
  BEFORE UPDATE ON public.clinical_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Treatment items (plano terapêutico)
CREATE TABLE public.treatment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  clinical_entry_id UUID NOT NULL REFERENCES public.clinical_entries(id) ON DELETE CASCADE,
  medication_name TEXT NOT NULL,
  dose NUMERIC,
  dose_unit TEXT DEFAULT 'mg',
  route TEXT DEFAULT 'Oral',
  frequency TEXT,
  duration_days INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.treatment_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own treatment items"
  ON public.treatment_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own treatment items"
  ON public.treatment_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own treatment items"
  ON public.treatment_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own treatment items"
  ON public.treatment_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_treatment_items_entry ON public.treatment_items(clinical_entry_id);

-- 3. Exam attachments
CREATE TABLE public.exam_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.pet_exams(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exam_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam attachments"
  ON public.exam_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own exam attachments"
  ON public.exam_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own exam attachments"
  ON public.exam_attachments FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_exam_attachments_exam ON public.exam_attachments(exam_id);

-- 4. Storage bucket for exam files
INSERT INTO storage.buckets (id, name, public) VALUES ('exam-files', 'exam-files', true);

CREATE POLICY "Authenticated users can upload exam files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exam-files' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view exam files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exam-files');

CREATE POLICY "Users can delete own exam files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'exam-files' AND auth.uid()::text = (storage.foldername(name))[1]);
