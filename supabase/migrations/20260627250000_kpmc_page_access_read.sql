-- KPMC — lecture droits menus par l'utilisateur + admins listent profils/rôles

DROP POLICY IF EXISTS "KPMC users read own page_access" ON kpmc.page_access;
CREATE POLICY "KPMC users read own page_access"
  ON kpmc.page_access FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
