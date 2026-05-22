
-- Table for species-specific dosing
CREATE TABLE public.drug_reference_doses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drug_reference_id UUID NOT NULL REFERENCES public.drug_reference(id) ON DELETE CASCADE,
  species TEXT NOT NULL,
  dose_min_mg_kg NUMERIC,
  dose_max_mg_kg NUMERIC,
  route TEXT,
  frequency TEXT,
  concentration_mg_ml NUMERIC,
  indication TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_drug_ref_doses_drug ON public.drug_reference_doses(drug_reference_id);
CREATE INDEX idx_drug_ref_doses_species ON public.drug_reference_doses(species);

ALTER TABLE public.drug_reference_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read drug reference doses"
  ON public.drug_reference_doses FOR SELECT
  USING (true);

-- Migrate existing dose data: for each drug that has dose info, create entries per species
INSERT INTO public.drug_reference_doses (drug_reference_id, species, dose_min_mg_kg, dose_max_mg_kg, route, frequency, concentration_mg_ml)
SELECT 
  dr.id,
  TRIM(s.species) as species,
  dr.dose_min_mg_kg,
  dr.dose_max_mg_kg,
  dr.route,
  dr.frequency,
  dr.concentration_mg_ml
FROM public.drug_reference dr,
LATERAL unnest(string_to_array(COALESCE(dr.species, 'Cães, Gatos'), ',')) AS s(species)
WHERE dr.dose_min_mg_kg IS NOT NULL OR dr.dose_max_mg_kg IS NOT NULL;
