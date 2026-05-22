-- 1) Adicionar colunas de rastreabilidade em financial_records
ALTER TABLE public.financial_records
  ADD COLUMN IF NOT EXISTS cash_session_id uuid,
  ADD COLUMN IF NOT EXISTS bill_id uuid,
  ADD COLUMN IF NOT EXISTS hospitalization_id uuid;

CREATE INDEX IF NOT EXISTS idx_financial_records_cash_session ON public.financial_records(cash_session_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_bill ON public.financial_records(bill_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_hospitalization ON public.financial_records(hospitalization_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_appointment ON public.financial_records(appointment_id);

-- 2) Função atômica de baixa de estoque (evita race conditions)
CREATE OR REPLACE FUNCTION public.decrement_stock(p_item_id uuid, p_qty numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.inventory_items
     SET quantity = quantity - p_qty,
         updated_at = now()
   WHERE id = p_item_id
     AND quantity >= p_qty
     AND public.is_team_member(user_id);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_stock(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, numeric) TO authenticated;

-- 3) Função para devolver estoque (usada em estornos)
CREATE OR REPLACE FUNCTION public.increment_stock(p_item_id uuid, p_qty numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_count int;
BEGIN
  UPDATE public.inventory_items
     SET quantity = quantity + p_qty,
         updated_at = now()
   WHERE id = p_item_id
     AND public.is_team_member(user_id);
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_stock(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_stock(uuid, numeric) TO authenticated;