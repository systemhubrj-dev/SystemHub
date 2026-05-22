
-- Enable realtime for subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;

-- Create subscriptions for existing users who don't have one yet
INSERT INTO public.subscriptions (user_id, status, trial_ends_at)
SELECT id, 'trialing', now() + interval '7 days'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;
