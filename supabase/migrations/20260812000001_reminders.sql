-- reminders: agendamento de lembretes para tutores/pets
CREATE TABLE IF NOT EXISTS public.reminders (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id        uuid        REFERENCES public.pets(id) ON DELETE SET NULL,
  client_id     uuid        REFERENCES public.clients(id) ON DELETE SET NULL,
  reminder_type text        NOT NULL DEFAULT 'vaccine',
  channel       text        NOT NULL DEFAULT 'email',
  message       text        NOT NULL,
  scheduled_date date       NOT NULL,
  advance_days  integer     NOT NULL DEFAULT 3,
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','sent','failed','cancelled')),
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminders_own" ON public.reminders
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminders_user_id_idx ON public.reminders(user_id);
CREATE INDEX IF NOT EXISTS reminders_status_idx  ON public.reminders(status);

-- reminder_logs: histórico de envios
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  reminder_id uuid        REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel     text        NOT NULL DEFAULT 'email',
  status      text        NOT NULL DEFAULT 'sent',
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_logs_own" ON public.reminder_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS reminder_logs_user_id_idx ON public.reminder_logs(user_id);
