-- Permitir que o dono dos registros deletados apague definitivamente da lixeira
CREATE POLICY "Users can permanently delete own trashed records"
ON public.deleted_records
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);