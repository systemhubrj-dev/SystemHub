
-- ============================================================
-- 1. SOFT-DELETE: Tabela genérica para registros deletados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.deleted_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  record_data jsonb NOT NULL,
  business_name text,
  deleted_by_name text,
  deleted_by_email text,
  reason text,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  purge_at timestamptz NOT NULL DEFAULT (now() + interval '60 days')
);

CREATE INDEX IF NOT EXISTS idx_deleted_records_user ON public.deleted_records(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_records_purge ON public.deleted_records(purge_at);
CREATE INDEX IF NOT EXISTS idx_deleted_records_table ON public.deleted_records(table_name);

ALTER TABLE public.deleted_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own deleted records"
  ON public.deleted_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own deleted records"
  ON public.deleted_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Sem UPDATE/DELETE para usuários (purga só por job)

-- Função de purga automática (executada via cron)
CREATE OR REPLACE FUNCTION public.purge_expired_deleted_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.deleted_records WHERE purge_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================
-- 2. DUPLICIDADE: índice único em profiles.cpf
-- ============================================================
-- Limpar CPFs duplicados antigos antes de criar índice único (mantém o mais antigo)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY cpf ORDER BY created_at) as rn
  FROM public.profiles
  WHERE cpf IS NOT NULL AND cpf != ''
)
UPDATE public.profiles SET cpf = NULL
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_cpf_unique
  ON public.profiles(cpf)
  WHERE cpf IS NOT NULL AND cpf != '';

-- ============================================================
-- 3. RPC para checar duplicidade (email + cpf) sem expor dados
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_signup_duplicate(
  p_email text,
  p_cpf text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  email_exists boolean := false;
  cpf_exists boolean := false;
BEGIN
  -- Checa email no auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email))
    INTO email_exists;

  -- Checa CPF na profiles
  IF p_cpf IS NOT NULL AND p_cpf != '' THEN
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE cpf = p_cpf)
      INTO cpf_exists;
  END IF;

  RETURN jsonb_build_object(
    'email_exists', email_exists,
    'cpf_exists', cpf_exists
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_signup_duplicate(text, text) TO anon, authenticated;
