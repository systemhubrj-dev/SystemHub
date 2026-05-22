-- Ensure admin account exists, has confirmed email, and password is set
DO $$
DECLARE
  v_uid uuid := '7445e95f-45f4-44b1-87eb-76c0a407fe30';
  v_email text := 'systemhubrj@gmail.com';
  v_pass text := 'SystemRJ@';
  v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = v_uid) INTO v_exists;

  IF v_exists THEN
    UPDATE auth.users
       SET encrypted_password = crypt(v_pass, gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_uid;
  ELSE
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    ) VALUES (
      v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      v_email, crypt(v_pass, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, jsonb_build_object('display_name','System Hub Admin'),
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), v_uid, jsonb_build_object('sub', v_uid::text, 'email', v_email), 'email', v_uid::text, now(), now(), now());
  END IF;

  -- Ensure on platform_admins whitelist
  INSERT INTO public.platform_admins (user_id, email)
  VALUES (v_uid, v_email)
  ON CONFLICT (user_id) DO NOTHING;

  -- Ensure profile exists
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (v_uid, 'System Hub Admin')
  ON CONFLICT (user_id) DO NOTHING;
END $$;