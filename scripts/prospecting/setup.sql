-- Tabela de leads de prospecção outbound
-- Rodar no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS public.outbound_leads (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  cnpj        text,
  clinic_name text,
  email       text        NOT NULL,
  phone       text,
  city        text,
  state       text,
  status      text        DEFAULT 'pending'
                          CHECK (status IN ('pending', 'sent', 'bounced', 'replied', 'unsubscribed')),
  sent_at     timestamptz,
  replied_at  timestamptz,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_outbound_leads_status  ON public.outbound_leads(status);
CREATE INDEX IF NOT EXISTS idx_outbound_leads_sent_at ON public.outbound_leads(sent_at);
CREATE INDEX IF NOT EXISTS idx_outbound_leads_state   ON public.outbound_leads(state);

ALTER TABLE public.outbound_leads ENABLE ROW LEVEL SECURITY;

-- Apenas service_role (backend/scripts) acessa — nenhum usuário público
-- (nenhuma policy pública necessária)

-- View de resumo do pipeline (útil no Supabase Table Editor)
CREATE OR REPLACE VIEW public.leads_pipeline AS
SELECT
  status,
  COUNT(*)                                        AS total,
  COUNT(*) FILTER (WHERE state = 'SP')            AS sp,
  COUNT(*) FILTER (WHERE state = 'MG')            AS mg,
  COUNT(*) FILTER (WHERE state = 'RJ')            AS rj,
  MIN(sent_at)                                    AS primeiro_envio,
  MAX(sent_at)                                    AS ultimo_envio
FROM public.outbound_leads
GROUP BY status
ORDER BY status;
