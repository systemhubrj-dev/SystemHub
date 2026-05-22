
ALTER TABLE public.services
  ADD COLUMN cost_price NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN stock_quantity INTEGER,
  ADD COLUMN min_stock INTEGER DEFAULT 0,
  ADD COLUMN expiry_date DATE,
  ADD COLUMN batch TEXT;
