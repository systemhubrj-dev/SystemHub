CREATE TABLE IF NOT EXISTS public.email_leads (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email      text        NOT NULL,
  source     text        DEFAULT 'bulario',
  created_at timestamptz DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.email_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous visitors) can subscribe
CREATE POLICY "Anon can insert email leads"
  ON public.email_leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Authenticated users can also insert (e.g. logged-in subscribers)
CREATE POLICY "Auth can insert email leads"
  ON public.email_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can read (admin panel)
CREATE POLICY "Auth can read email leads"
  ON public.email_leads
  FOR SELECT
  TO authenticated
  USING (true);
