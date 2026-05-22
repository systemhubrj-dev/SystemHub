-- Add traceability fields to drug_catalog
ALTER TABLE public.drug_catalog
  ADD COLUMN IF NOT EXISTS created_by_name text,
  ADD COLUMN IF NOT EXISTS updated_by_name text;