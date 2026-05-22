
-- 1. Add fields to inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS administration_route TEXT,
  ADD COLUMN IF NOT EXISTS presentation TEXT DEFAULT 'unidade';

-- 2. Services/procedures catalog
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'consulta',
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own services" ON public.services FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own services" ON public.services FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own services" ON public.services FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own services" ON public.services FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Cash sessions (abertura/fechamento de caixa)
CREATE TABLE public.cash_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cash sessions" ON public.cash_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cash sessions" ON public.cash_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cash sessions" ON public.cash_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cash sessions" ON public.cash_sessions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_cash_sessions_updated_at
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Cash items (itens vendidos)
CREATE TABLE public.cash_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.cash_sessions(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL DEFAULT 'product',
  inventory_item_id UUID REFERENCES public.inventory_items(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'dinheiro',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own cash items" ON public.cash_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cash items" ON public.cash_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cash items" ON public.cash_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cash items" ON public.cash_items FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_cash_items_session ON public.cash_items(session_id);
CREATE INDEX idx_cash_items_inventory ON public.cash_items(inventory_item_id);
CREATE INDEX idx_cash_items_service ON public.cash_items(service_id);
