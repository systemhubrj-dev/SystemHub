
-- user_roles: explicit INSERT policy — only the owner (or platform admin) can add team members
CREATE POLICY "Owners insert their team roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id OR public.is_platform_admin(auth.uid()));

-- user_role_permissions: explicit INSERT policy — only the owner (or platform admin) can create permission rows
CREATE POLICY "Owners insert permissions"
ON public.user_role_permissions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id OR public.is_platform_admin(auth.uid()));
