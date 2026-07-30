-- Add expiry notification tracking to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS expiry_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS subscriptions_expiry_notified_idx
  ON public.subscriptions (expiry_notified_at)
  WHERE expiry_notified_at IS NULL;

-- Enable pg_cron and pg_net extensions (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule daily trial expiry check at 9am UTC (6am Brasília)
-- Calls the trial-expiry-check edge function via HTTP
SELECT cron.schedule(
  'trial-expiry-check-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (
      SELECT decrypted_secret
      FROM vault.decrypted_secrets
      WHERE name = 'supabase_url'
    ) || '/functions/v1/trial-expiry-check',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret
        FROM vault.decrypted_secrets
        WHERE name = 'service_role_key'
      )
    ),
    body := '{}'::text
  );
  $$
);
