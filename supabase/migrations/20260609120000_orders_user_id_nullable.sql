-- Commandes invitées : pas de compte auth.users → user_id NULL autorisé
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

COMMENT ON COLUMN public.orders.user_id IS
  'Utilisateur connecté ; NULL pour les commandes invité (email dans user_email).';
