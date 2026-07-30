-- Add user tracking columns to page_views
ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS user_email text;

CREATE INDEX IF NOT EXISTS page_views_user_id_idx ON public.page_views (user_id);
CREATE INDEX IF NOT EXISTS page_views_user_email_idx ON public.page_views (user_email);
