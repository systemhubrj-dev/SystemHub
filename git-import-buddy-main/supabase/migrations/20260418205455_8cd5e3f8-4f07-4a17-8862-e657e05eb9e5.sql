
-- 1) Subscriptions: prevent users from escalating their own plan/status.
-- Drop any existing permissive UPDATE policies and replace with a no-op (server-side only).
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='subscriptions' AND cmd='UPDATE'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.subscriptions', pol.policyname);
  END LOOP;
END $$;

-- No UPDATE policy = no client can update. Service role (used by edge functions) bypasses RLS.

-- 2) deleted_records: restrict INSERT to authenticated role only.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='deleted_records' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.deleted_records', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can insert their own deleted_records"
ON public.deleted_records
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 3) inventory_movements: restrict INSERT to authenticated role only.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='public' AND tablename='inventory_movements' AND cmd='INSERT'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.inventory_movements', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Authenticated users can insert their own inventory_movements"
ON public.inventory_movements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
