
-- subscriptions: explicit deny for client UPDATE/DELETE (server-only via service role)
CREATE POLICY "No client updates on subscriptions"
ON public.subscriptions FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "No client deletes on subscriptions"
ON public.subscriptions FOR DELETE TO authenticated USING (false);

-- inventory_movements: owner-scoped UPDATE/DELETE
CREATE POLICY "Users can update their own inventory_movements"
ON public.inventory_movements FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory_movements"
ON public.inventory_movements FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- reminder_logs: owner-scoped UPDATE/DELETE
CREATE POLICY "Users can update their own reminder_logs"
ON public.reminder_logs FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminder_logs"
ON public.reminder_logs FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- exam_attachments: owner-scoped UPDATE
CREATE POLICY "Users can update their own exam_attachments"
ON public.exam_attachments FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
