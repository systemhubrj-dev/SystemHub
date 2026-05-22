
-- ============== Fornecedores ==============
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  legal_type text NOT NULL DEFAULT 'pj', -- 'pf' | 'pj'
  name text NOT NULL,                     -- razão social ou nome
  trade_name text,                        -- nome fantasia
  document text,                          -- CPF ou CNPJ
  ie text,                                -- inscrição estadual
  email text,
  phone text,
  phone2 text,
  website text,
  -- endereço
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  -- vendedor (PJ)
  seller_name text,
  seller_phone text,
  seller_email text,
  notes text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team can view suppliers" ON public.suppliers
  FOR SELECT USING (public.is_team_member(user_id));
CREATE POLICY "Team can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (public.is_team_member(user_id));
CREATE POLICY "Team can update suppliers" ON public.suppliers
  FOR UPDATE USING (public.is_team_member(user_id));
CREATE POLICY "Team can delete suppliers" ON public.suppliers
  FOR DELETE USING (public.is_team_member(user_id));

CREATE TRIGGER suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_suppliers_user ON public.suppliers(user_id);

-- Coluna supplier_id em inventory_items (mantém o text 'supplier' por compatibilidade)
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- ============== Comissão por item ==============
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'none', -- 'none' | 'percent' | 'fixed'
  ADD COLUMN IF NOT EXISTS commission_value numeric NOT NULL DEFAULT 0;

ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS commission_value numeric NOT NULL DEFAULT 0;

-- ============== Trigger de comissão automática (atualizada) ==============
CREATE OR REPLACE FUNCTION public.auto_compute_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  emp_pct numeric := 0;
  item_type_c text := NULL;
  item_value numeric := 0;
  total numeric := 0;
  comm numeric := 0;
BEGIN
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  total := COALESCE(NEW.subtotal, COALESCE(NEW.unit_price,0) * COALESCE(NEW.quantity,0)) - COALESCE(NEW.discount,0);
  IF total <= 0 THEN
    RETURN NEW;
  END IF;

  -- 1) Tenta comissão definida no item (serviço ou produto)
  IF NEW.item_type = 'service' AND NEW.service_id IS NOT NULL THEN
    SELECT commission_type, commission_value INTO item_type_c, item_value
    FROM public.services WHERE id = NEW.service_id;
  ELSIF NEW.item_type = 'product' AND NEW.inventory_item_id IS NOT NULL THEN
    SELECT commission_type, commission_value INTO item_type_c, item_value
    FROM public.inventory_items WHERE id = NEW.inventory_item_id;
  END IF;

  IF item_type_c = 'percent' AND COALESCE(item_value,0) > 0 THEN
    comm := round((total * item_value / 100.0)::numeric, 2);
  ELSIF item_type_c = 'fixed' AND COALESCE(item_value,0) > 0 THEN
    comm := round((item_value * COALESCE(NEW.quantity,1))::numeric, 2);
  ELSE
    -- 2) Fallback: comissão default do funcionário
    SELECT COALESCE(commission_percent, 0) INTO emp_pct
    FROM public.employees WHERE id = NEW.employee_id AND user_id = NEW.user_id;
    IF emp_pct IS NULL OR emp_pct <= 0 THEN
      RETURN NEW;
    END IF;
    comm := round((total * emp_pct / 100.0)::numeric, 2);
  END IF;

  IF comm <= 0 THEN
    RETURN NEW;
  END IF;

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

-- (Re)criar o trigger no cash_items caso não exista
DROP TRIGGER IF EXISTS trg_auto_compute_commission ON public.cash_items;
CREATE TRIGGER trg_auto_compute_commission
  AFTER INSERT ON public.cash_items
  FOR EACH ROW EXECUTE FUNCTION public.auto_compute_commission();
