
-- 1) Whitelist table
CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- 2) Audit table
CREATE TABLE IF NOT EXISTS public.platform_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  acting_as uuid,
  action text NOT NULL,
  table_name text,
  record_count integer DEFAULT 1,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admin_audit ENABLE ROW LEVEL SECURITY;

-- 3) Helper function — checks whitelist
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id);
$$;

-- 4) RLS on the new tables
DROP POLICY IF EXISTS "Platform admins read whitelist" ON public.platform_admins;
CREATE POLICY "Platform admins read whitelist"
  ON public.platform_admins FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins read audit" ON public.platform_admin_audit;
CREATE POLICY "Platform admins read audit"
  ON public.platform_admin_audit FOR SELECT
  USING (public.is_platform_admin(auth.uid()));

DROP POLICY IF EXISTS "Platform admins insert audit" ON public.platform_admin_audit;
CREATE POLICY "Platform admins insert audit"
  ON public.platform_admin_audit FOR INSERT
  WITH CHECK (public.is_platform_admin(auth.uid()) AND admin_id = auth.uid());

-- 5) Open multi-tenant doors for platform admins by extending is_team_member
CREATE OR REPLACE FUNCTION public.is_team_member(_owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() = _owner
      OR public.is_platform_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND owner_id = _owner
      );
$$;

-- 6) Seed initial admin (systemhubrj@gmail.com) if account exists
INSERT INTO public.platform_admins (user_id, email)
SELECT id, email FROM auth.users WHERE lower(email) = 'systemhubrj@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
