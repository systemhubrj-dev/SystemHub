-- 1. Fix subscriptions INSERT policy: restrict to authenticated role only
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users insert own subscription" ON public.subscriptions;

-- Recreate with authenticated role + null guard
CREATE POLICY "Authenticated users can insert own subscription"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- 2. exam_attachments: lack of UPDATE policy is intentional (attachments are immutable);
-- no change needed. Documented here for clarity.
COMMENT ON TABLE public.exam_attachments IS 'Attachments are immutable: only INSERT/SELECT/DELETE allowed by design.';