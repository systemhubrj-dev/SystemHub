-- SECURITY: Invalidate admin password that was exposed in git history.
-- The password 'SystemRJ@' was hardcoded in migration 20260508012345.
-- This migration forces a password reset so the exposed credential cannot be used.
-- ACTION REQUIRED: set a new password via Supabase Dashboard → Authentication → Users.

DO $$
DECLARE
  v_uid uuid := '7445e95f-45f4-44b1-87eb-76c0a407fe30';
BEGIN
  -- Scramble the password with a random salt so the exposed value no longer works.
  -- The admin must reset via Supabase Dashboard or the "Forgot password" flow.
  UPDATE auth.users
     SET encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf')),
         updated_at = now()
   WHERE id = v_uid;

  -- Log the security action
  RAISE NOTICE 'Admin password invalidated for user %. Reset required via Supabase Dashboard.', v_uid;
END;
$$;
