-- 1) Tighten subscriptions: remove permissive INSERT policies.
-- Subscriptions are created by the auth trigger handle_new_subscription (SECURITY DEFINER)
-- and updated by edge functions using the service role key, which bypasses RLS.
-- No client-side INSERT should be allowed because the WITH CHECK only validated ownership,
-- letting any authenticated user insert a row with status='active' and any plan_id.
DROP POLICY IF EXISTS "Service can insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Authenticated users can insert own subscription" ON public.subscriptions;

-- Explicit deny INSERT from clients (service role bypasses RLS).
CREATE POLICY "No client inserts on subscriptions"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (false);

-- 2) Auto-clear plaintext temp_password from employees after 7 days,
-- limiting the exposure window for stored temporary credentials.
CREATE OR REPLACE FUNCTION public.clear_expired_temp_passwords()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer;
BEGIN
  UPDATE public.employees
     SET temp_password = NULL
   WHERE temp_password IS NOT NULL
     AND temp_password_set_at IS NOT NULL
     AND temp_password_set_at < (now() - interval '7 days');
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Run an immediate cleanup of any already-stale credentials.
SELECT public.clear_expired_temp_passwords();