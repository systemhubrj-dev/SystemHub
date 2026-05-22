
-- Create inventory_batches table
CREATE TABLE public.inventory_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  batch TEXT,
  expiry_date DATE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own batches"
ON public.inventory_batches FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own batches"
ON public.inventory_batches FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own batches"
ON public.inventory_batches FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own batches"
ON public.inventory_batches FOR DELETE
USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_inventory_batches_item_id ON public.inventory_batches(item_id);
CREATE INDEX idx_inventory_batches_expiry ON public.inventory_batches(expiry_date);

-- Migrate existing data: create a batch record for each inventory_item that has batch or expiry_date or quantity > 0
INSERT INTO public.inventory_batches (user_id, item_id, batch, expiry_date, quantity, unit_cost)
SELECT user_id, id, batch, expiry_date, quantity, cost_price
FROM public.inventory_items
WHERE quantity > 0 OR batch IS NOT NULL OR expiry_date IS NOT NULL;
