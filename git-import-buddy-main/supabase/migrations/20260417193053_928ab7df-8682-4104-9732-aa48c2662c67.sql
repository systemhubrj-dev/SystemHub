ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS business_cnpj text,
  ADD COLUMN IF NOT EXISTS business_ie text;