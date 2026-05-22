-- Add cpf and address to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS address text;

-- Fix security: make pet-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'pet-attachments';

-- Fix security: add missing UPDATE policy on pet_attachments
CREATE POLICY "Users can update their own pet attachments records"
ON public.pet_attachments
FOR UPDATE
USING (auth.uid() = user_id);