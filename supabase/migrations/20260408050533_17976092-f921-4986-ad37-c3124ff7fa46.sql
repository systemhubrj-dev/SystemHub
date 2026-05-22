
-- Sequence for document numbering
CREATE SEQUENCE public.vet_document_number_seq START 1;

-- Vet documents table
CREATE TABLE public.vet_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  pet_id uuid REFERENCES public.pets(id) ON DELETE SET NULL,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  document_number integer NOT NULL DEFAULT nextval('public.vet_document_number_seq'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.vet_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents" ON public.vet_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.vet_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.vet_documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.vet_documents FOR DELETE USING (auth.uid() = user_id);

-- Add CRMV to profiles
ALTER TABLE public.profiles ADD COLUMN crmv text;
