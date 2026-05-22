
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS temp_password text,
  ADD COLUMN IF NOT EXISTS temp_password_set_at timestamptz;

COMMENT ON COLUMN public.employees.temp_password IS
  'Senha inicial gerada pelo dono ao convidar o funcionário. Visível apenas para o owner via RLS para permitir reenvio (WhatsApp). Funcionário deve trocar no primeiro login.';
