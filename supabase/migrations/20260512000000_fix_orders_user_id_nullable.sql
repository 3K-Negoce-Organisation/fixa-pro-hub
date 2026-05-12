-- Rendre user_id nullable pour permettre les commandes invité.
-- La contrainte NOT NULL d'origine bloquait silencieusement toute insertion
-- dont user_id était null (webhook Stripe pour guest) ou un UUID invalide
-- (generateGuestId() frontend = "guest_xxx" non-UUID).
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
