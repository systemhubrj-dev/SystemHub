
-- Add address fields to clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS street text,
  ADD COLUMN IF NOT EXISTS number text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS complement text;

-- Create hospitalization_items table
CREATE TABLE public.hospitalization_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  hospitalization_id uuid NOT NULL REFERENCES public.hospitalizations(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'product',
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL DEFAULT 0,
  inventory_item_id uuid REFERENCES public.inventory_items(id),
  service_id uuid REFERENCES public.services(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.hospitalization_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hospitalization items"
  ON public.hospitalization_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hospitalization items"
  ON public.hospitalization_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own hospitalization items"
  ON public.hospitalization_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own hospitalization items"
  ON public.hospitalization_items FOR DELETE
  USING (auth.uid() = user_id);
