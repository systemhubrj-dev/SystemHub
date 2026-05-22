
CREATE TABLE public.drug_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  drug_reference_id UUID NOT NULL REFERENCES public.drug_reference(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, drug_reference_id)
);

CREATE INDEX idx_drug_favorites_user ON public.drug_favorites(user_id);

ALTER TABLE public.drug_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.drug_favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites"
  ON public.drug_favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON public.drug_favorites FOR DELETE
  USING (auth.uid() = user_id);
