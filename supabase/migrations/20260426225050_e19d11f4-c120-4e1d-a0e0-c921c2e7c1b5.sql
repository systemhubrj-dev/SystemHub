CREATE OR REPLACE FUNCTION public.prevent_self_team_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id = NEW.owner_id AND NEW.role <> 'owner' THEN
    RAISE EXCEPTION 'O proprietário da conta não pode ser cadastrado como membro da própria equipe.';
  END IF;
  RETURN NEW;
END;
$$;