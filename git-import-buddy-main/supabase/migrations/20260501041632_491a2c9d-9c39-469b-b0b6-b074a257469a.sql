-- 1) PRIVILEGE_ESCALATION: lock down user_roles INSERT (server-side only)
DROP POLICY IF EXISTS "Owners manage their team roles" ON public.user_roles;

-- Owners can SELECT their team roles
CREATE POLICY "Owners view their team roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Owners can UPDATE roles in their team (e.g. change a vet to receptionist)
CREATE POLICY "Owners update their team roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Owners can DELETE (revoke) members from their team
CREATE POLICY "Owners revoke their team roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- NOTE: No INSERT policy for clients. Only the service-role edge function
-- (`invite-employee`) may create user_roles rows. This prevents any
-- authenticated user from inserting (owner_id = self, user_id = victim)
-- and pulling another user's data into their "team".

-- 2) MISSING_RLS: add owner-direct policies on hospitalizations
CREATE POLICY "Owner can view own hospitalizations"
ON public.hospitalizations
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Owner can insert own hospitalizations"
ON public.hospitalizations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own hospitalizations"
ON public.hospitalizations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own hospitalizations"
ON public.hospitalizations
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3) Stop persisting plaintext temp passwords
-- Clear any existing values then drop the columns. The invite-employee
-- edge function already returns the password once in the HTTP response,
-- which the UI shows in a one-time credentials dialog.
UPDATE public.employees
   SET temp_password = NULL,
       temp_password_set_at = NULL
 WHERE temp_password IS NOT NULL
    OR temp_password_set_at IS NOT NULL;

ALTER TABLE public.employees DROP COLUMN IF EXISTS temp_password;
ALTER TABLE public.employees DROP COLUMN IF EXISTS temp_password_set_at;

-- The auto-clear function is no longer needed
DROP FUNCTION IF EXISTS public.clear_expired_temp_passwords();

-- 4) SECURITY DEFINER functions: revoke EXECUTE from anon/authenticated for
-- internal-only functions (triggers + maintenance jobs). Keep helpers used
-- by RLS policies executable so policies still work.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_subscription() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_self_team_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.auto_compute_commission() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_deleted_records() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_signup_duplicate(text, text) FROM PUBLIC, anon;
-- check_signup_duplicate stays callable by authenticated for the signup flow
GRANT EXECUTE ON FUNCTION public.check_signup_duplicate(text, text) TO authenticated;
