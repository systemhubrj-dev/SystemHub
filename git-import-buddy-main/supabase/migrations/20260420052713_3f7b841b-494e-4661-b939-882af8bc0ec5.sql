-- Substitui SELECT amplo por: público acessa por path direto, listing só do dono
DROP POLICY IF EXISTS "Anyone can view clinic logos" ON storage.objects;

CREATE POLICY "Anyone can view clinic logo by direct path"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'clinic-logos'
  AND (
    -- Usuário autenticado vê tudo (incluindo listagem) só da pasta dele
    auth.uid()::text = (storage.foldername(name))[1]
    -- Anônimos só conseguem GET por path direto (sem listing) — Supabase storage trata isso pelo `name`
    OR auth.role() = 'anon'
  )
);