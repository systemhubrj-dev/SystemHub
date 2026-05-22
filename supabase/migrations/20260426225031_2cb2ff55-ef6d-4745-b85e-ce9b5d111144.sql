-- 1) Remove linhas inválidas (owner cadastrado como membro da própria conta)
DELETE FROM public.user_roles
WHERE user_id = owner_id
  AND role <> 'owner';

-- 2) Também remove a linha do employee criado em cima do próprio dono, se houver
DELETE FROM public.employees e
USING auth.users u
WHERE e.auth_user_id = u.id
  AND e.user_id = u.id;

-- 3) Trava a nível de banco para impedir o problema voltar
CREATE OR REPLACE FUNCTION public.prevent_self_team_role()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id = NEW.owner_id AND NEW.role <> 'owner' THEN
    RAISE EXCEPTION 'O proprietário da conta não pode ser cadastrado como membro da própria equipe.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_team_role ON public.user_roles;
CREATE TRIGGER trg_prevent_self_team_role
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_team_role();