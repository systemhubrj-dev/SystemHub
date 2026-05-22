
-- Add drug_catalog_id to inventory_items for bulário integration
ALTER TABLE public.inventory_items 
ADD COLUMN drug_catalog_id uuid REFERENCES public.drug_catalog(id) ON DELETE SET NULL;

-- Function to get items below minimum stock
CREATE OR REPLACE FUNCTION public.get_low_stock_items(p_user_id uuid)
RETURNS TABLE(
  id uuid,
  name text,
  quantity numeric,
  min_quantity numeric,
  location text,
  category text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.quantity, i.min_quantity, i.location, i.category
  FROM public.inventory_items i
  WHERE i.user_id = p_user_id
    AND i.quantity <= i.min_quantity
  ORDER BY (i.quantity - i.min_quantity) ASC;
$$;

-- Function to get items expiring within N days
CREATE OR REPLACE FUNCTION public.get_expiring_items(p_user_id uuid, p_days integer DEFAULT 30)
RETURNS TABLE(
  id uuid,
  name text,
  batch text,
  expiry_date date,
  quantity numeric,
  location text,
  days_until_expiry integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.name, i.batch, i.expiry_date, i.quantity, i.location,
         (i.expiry_date - CURRENT_DATE)::integer as days_until_expiry
  FROM public.inventory_items i
  WHERE i.user_id = p_user_id
    AND i.expiry_date IS NOT NULL
    AND i.expiry_date <= (CURRENT_DATE + (p_days || ' days')::interval)
  ORDER BY i.expiry_date ASC;
$$;
