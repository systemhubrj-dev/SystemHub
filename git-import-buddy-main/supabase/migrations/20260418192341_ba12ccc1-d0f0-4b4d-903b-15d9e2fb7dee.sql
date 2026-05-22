-- 1. Fix SECURITY DEFINER functions that accept arbitrary user_id
CREATE OR REPLACE FUNCTION public.get_low_stock_items(p_user_id uuid)
 RETURNS TABLE(id uuid, name text, quantity numeric, min_quantity numeric, location text, category text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.name, i.quantity, i.min_quantity, i.location, i.category
  FROM public.inventory_items i
  WHERE i.user_id = p_user_id
    AND i.user_id = auth.uid()
    AND i.quantity <= i.min_quantity
  ORDER BY (i.quantity - i.min_quantity) ASC;
$function$;

CREATE OR REPLACE FUNCTION public.get_expiring_items(p_user_id uuid, p_days integer DEFAULT 30)
 RETURNS TABLE(id uuid, name text, batch text, expiry_date date, quantity numeric, location text, days_until_expiry integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT i.id, i.name, i.batch, i.expiry_date, i.quantity, i.location,
         (i.expiry_date - CURRENT_DATE)::integer as days_until_expiry
  FROM public.inventory_items i
  WHERE i.user_id = p_user_id
    AND i.user_id = auth.uid()
    AND i.expiry_date IS NOT NULL
    AND i.expiry_date <= (CURRENT_DATE + (p_days || ' days')::interval)
  ORDER BY i.expiry_date ASC;
$function$;

-- 2. Add missing UPDATE policy on pet_weights
CREATE POLICY "Users can update their own pet weights"
ON public.pet_weights
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Restrict check_signup_duplicate to authenticated callers
REVOKE EXECUTE ON FUNCTION public.check_signup_duplicate(text, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_signup_duplicate(text, text) TO authenticated;

-- 4. Remove subscriptions table from realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'subscriptions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions';
  END IF;
END $$;