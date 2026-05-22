
-- 1. Enum de perfis
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('owner', 'vet', 'receptionist', 'stockist');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Tabela user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, owner_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Funções SECURITY DEFINER (sem recursão)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- Retorna o owner_id (dono da clínica) ao qual o usuário pertence.
-- Se ele mesmo for o dono => retorna seu próprio uid.
CREATE OR REPLACE FUNCTION public.current_owner_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM public.user_roles WHERE user_id = auth.uid() AND role <> 'owner' LIMIT 1),
    auth.uid()
  );
$$;

-- True se auth.uid() é o próprio dono OU pertence ao time deste owner
CREATE OR REPLACE FUNCTION public.is_team_member(_owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() = _owner
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND owner_id = _owner
      );
$$;

-- Retorna o role do usuário dentro de um owner (NULL se não pertence)
CREATE OR REPLACE FUNCTION public.team_role_for(_owner uuid)
RETURNS public.app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() = _owner THEN 'owner'::public.app_role
    ELSE (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND owner_id = _owner LIMIT 1)
  END;
$$;

-- 4. RLS user_roles
DROP POLICY IF EXISTS "Owners manage their team roles" ON public.user_roles;
CREATE POLICY "Owners manage their team roles"
ON public.user_roles FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members can view their own role row" ON public.user_roles;
CREATE POLICY "Members can view their own role row"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- 5. Permissões customizadas por usuário
CREATE TABLE IF NOT EXISTS public.user_role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, owner_id)
);
ALTER TABLE public.user_role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage permissions" ON public.user_role_permissions;
CREATE POLICY "Owners manage permissions"
ON public.user_role_permissions FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Members read own permissions" ON public.user_role_permissions;
CREATE POLICY "Members read own permissions"
ON public.user_role_permissions FOR SELECT
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_role_permissions_updated_at
BEFORE UPDATE ON public.user_role_permissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. employees ganha vínculo de login
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS auth_user_id uuid,
  ADD COLUMN IF NOT EXISTS app_role public.app_role;

-- 7. Atualizar RLS das tabelas operacionais para usar is_team_member(user_id)
-- Padrão: SELECT/INSERT/UPDATE/DELETE liberados para qualquer membro do time.
-- Restrições por cargo são feitas na UI/edge functions (financeiro/funcionarios continuam só do dono).

-- helper para recriar policies rapidamente
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clients','pets','appointments','clinical_entries','clinical_records',
    'inventory_items','inventory_batches','inventory_movements',
    'cash_sessions','cash_items',
    'pet_vaccines','pet_weights','pet_exams','pet_notes','pet_attachments','exam_attachments',
    'pet_presales','pet_presale_items',
    'hospitalizations','hospitalization_evolutions','hospitalization_items','hospitalization_medications','nursing_checks',
    'reminders','reminder_logs','services'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- drop policies antigas (nomes variados)
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON public.%I', t, t);

    -- novas policies team-aware
    EXECUTE format('CREATE POLICY "Team can view %s" ON public.%I FOR SELECT USING (public.is_team_member(user_id))', t, t);
    EXECUTE format('CREATE POLICY "Team can insert %s" ON public.%I FOR INSERT WITH CHECK (public.is_team_member(user_id))', t, t);
    EXECUTE format('CREATE POLICY "Team can update %s" ON public.%I FOR UPDATE USING (public.is_team_member(user_id))', t, t);
    EXECUTE format('CREATE POLICY "Team can delete %s" ON public.%I FOR DELETE USING (public.is_team_member(user_id))', t, t);
  END LOOP;
END $$;

-- 8. Tabelas restritas ao dono (financeiro, funcionários, comissões, contas a pagar)
DO $$
DECLARE
  t text;
  owner_only text[] := ARRAY['financial_records','employees','employee_commissions','bills'];
BEGIN
  FOREACH t IN ARRAY owner_only LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own %s" ON public.%I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own bills" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own bills" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own bills" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own bills" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own records" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own records" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own records" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own records" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own commissions" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own commissions" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own commissions" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own commissions" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can view own employees" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can insert own employees" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can update own employees" ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Users can delete own employees" ON public.%I', t);

    EXECUTE format('CREATE POLICY "Owner only view %s" ON public.%I FOR SELECT USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "Owner only insert %s" ON public.%I FOR INSERT WITH CHECK (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "Owner only update %s" ON public.%I FOR UPDATE USING (auth.uid() = user_id)', t, t);
    EXECUTE format('CREATE POLICY "Owner only delete %s" ON public.%I FOR DELETE USING (auth.uid() = user_id)', t, t);
  END LOOP;
END $$;
