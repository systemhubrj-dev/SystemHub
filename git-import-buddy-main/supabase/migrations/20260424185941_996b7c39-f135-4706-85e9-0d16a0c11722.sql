-- 1) Coluna employee_id em cash_items
ALTER TABLE public.cash_items
  ADD COLUMN IF NOT EXISTS employee_id uuid;

CREATE INDEX IF NOT EXISTS idx_cash_items_employee ON public.cash_items(employee_id);

-- 2) Marcadores em employee_commissions
ALTER TABLE public.employee_commissions
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_cash_item_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS uq_employee_commissions_source_item
  ON public.employee_commissions(source_cash_item_id)
  WHERE source_cash_item_id IS NOT NULL;

-- 3) Função de comissão automática
CREATE OR REPLACE FUNCTION public.auto_compute_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pct numeric := 0;
  total numeric := 0;
  comm numeric := 0;
BEGIN
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(commission_percent, 0)
    INTO pct
  FROM public.employees
  WHERE id = NEW.employee_id AND user_id = NEW.user_id;

  IF pct IS NULL OR pct <= 0 THEN
    RETURN NEW;
  END IF;

  total := COALESCE(NEW.subtotal, COALESCE(NEW.unit_price,0) * COALESCE(NEW.quantity,0)) - COALESCE(NEW.discount,0);
  IF total <= 0 THEN
    RETURN NEW;
  END IF;

  comm := round((total * pct / 100.0)::numeric, 2);

  INSERT INTO public.employee_commissions(
    user_id, employee_id, amount, date, notes, auto_generated, source_cash_item_id
  ) VALUES (
    NEW.user_id,
    NEW.employee_id,
    comm,
    CURRENT_DATE,
    'Comissão automática — ' || COALESCE(NEW.description,'venda'),
    true,
    NEW.id
  )
  ON CONFLICT (source_cash_item_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_commission_cash_items ON public.cash_items;
CREATE TRIGGER trg_auto_commission_cash_items
AFTER INSERT ON public.cash_items
FOR EACH ROW
EXECUTE FUNCTION public.auto_compute_commission();