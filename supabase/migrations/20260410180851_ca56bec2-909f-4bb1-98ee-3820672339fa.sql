ALTER TABLE public.prescriptions 
  ADD COLUMN IF NOT EXISTS route text,
  ADD COLUMN IF NOT EXISTS form text,
  ADD COLUMN IF NOT EXISTS prescription_type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS show_date boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sipeagro_number text;