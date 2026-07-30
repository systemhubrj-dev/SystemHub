-- Returns last_sign_in_at for all non-admin users, accessible only to platform admins
CREATE OR REPLACE FUNCTION public.admin_user_last_login()
RETURNS TABLE(user_id uuid, last_sign_in_at timestamptz)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.last_sign_in_at
  FROM auth.users au
  WHERE EXISTS (
    SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.admin_user_last_login() TO authenticated;
