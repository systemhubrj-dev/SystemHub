-- Storage bucket for pet attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('pet-attachments', 'pet-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Users can view their own pet attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'pet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own pet attachments"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'pet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own pet attachments"
ON storage.objects FOR UPDATE
USING (bucket_id = 'pet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own pet attachments"
ON storage.objects FOR DELETE
USING (bucket_id = 'pet-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Pet attachments tracking table
CREATE TABLE public.pet_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  file_url TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pet attachments records"
ON public.pet_attachments FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pet attachments records"
ON public.pet_attachments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pet attachments records"
ON public.pet_attachments FOR DELETE USING (auth.uid() = user_id);

-- Pre-sales table
CREATE TABLE public.pet_presales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_presales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presales"
ON public.pet_presales FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presales"
ON public.pet_presales FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presales"
ON public.pet_presales FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presales"
ON public.pet_presales FOR DELETE USING (auth.uid() = user_id);

-- Pre-sale items
CREATE TABLE public.pet_presale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  presale_id UUID NOT NULL REFERENCES public.pet_presales(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'product',
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pet_presale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own presale items"
ON public.pet_presale_items FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own presale items"
ON public.pet_presale_items FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presale items"
ON public.pet_presale_items FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presale items"
ON public.pet_presale_items FOR DELETE USING (auth.uid() = user_id);