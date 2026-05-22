CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  original_price NUMERIC NOT NULL DEFAULT 0,
  promo_price NUMERIC NOT NULL DEFAULT 0,
  coupon_code TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own promotions" ON public.promotions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own promotions" ON public.promotions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own promotions" ON public.promotions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own promotions" ON public.promotions FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();