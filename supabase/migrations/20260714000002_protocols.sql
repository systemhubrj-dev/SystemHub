CREATE TABLE public.protocols (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text        NOT NULL,
  species     text,
  condition   text,
  description text,
  steps       text,
  medications text,
  notes       text,
  image_url   text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

-- Anyone (sem login) pode ler protocolos
CREATE POLICY "Public read protocols"
  ON public.protocols FOR SELECT TO public
  USING (true);

-- Só platform admins podem criar/editar/deletar
CREATE POLICY "Platform admins manage protocols"
  ON public.protocols FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
  );
