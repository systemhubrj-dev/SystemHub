-- Campos dinâmicos e expansíveis para estoque
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS barcode text,
  ADD COLUMN IF NOT EXISTS concentration text,
  ADD COLUMN IF NOT EXISTS pharmaceutical_form text,
  ADD COLUMN IF NOT EXISTS special_control boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prescription_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS species text,
  ADD COLUMN IF NOT EXISTS vaccine_type text,
  ADD COLUMN IF NOT EXISTS manufacturer text,
  ADD COLUMN IF NOT EXISTS storage_temperature text,
  ADD COLUMN IF NOT EXISTS doses_per_vial numeric,
  ADD COLUMN IF NOT EXISTS opened_at date,
  ADD COLUMN IF NOT EXISTS material_type text,
  ADD COLUMN IF NOT EXISTS sterilization_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS composition text,
  ADD COLUMN IF NOT EXISTS indication text,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS weight_volume text,
  ADD COLUMN IF NOT EXISTS extra_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_inventory_items_category_subcategory
  ON public.inventory_items(user_id, category, subcategory);

CREATE INDEX IF NOT EXISTS idx_inventory_items_sku
  ON public.inventory_items(user_id, sku)
  WHERE sku IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_items_barcode
  ON public.inventory_items(user_id, barcode)
  WHERE barcode IS NOT NULL;

-- Permite que funcionário vinculado valide o plano do assinante responsável
DROP POLICY IF EXISTS "Team can view owner subscription" ON public.subscriptions;
CREATE POLICY "Team can view owner subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (public.is_team_member(user_id));