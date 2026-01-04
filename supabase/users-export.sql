-- ============================================
-- EXPORT UTILISATEURS ET DONNÉES LIÉES
-- Date d'export: 2026-01-04
-- ============================================

-- NOTE IMPORTANTE:
-- Les utilisateurs auth.users ne peuvent pas être directement insérés via SQL.
-- Ils doivent être créés via l'API Supabase Auth ou invités manuellement.
-- Ce fichier documente les utilisateurs existants et leurs données associées.

-- ============================================
-- UTILISATEURS (référence - auth.users)
-- Ces utilisateurs doivent être recréés via signup
-- ============================================
-- Email: pierre.kabore@gmail.com | ID: 972f7326-923c-4d86-a6cb-c2923f649e71 | Créé: 2025-12-07
-- Email: christophe.kabore@gmail.com | ID: af0d0ef6-ce1e-458d-ad39-5517bbb72567 | Créé: 2025-12-07
-- Email: kaborematthieu@gmail.com | ID: cc30cf8f-2722-49ac-a348-11bc087dc1fe | Créé: 2025-12-30

-- ============================================
-- PROFILES (3 profils)
-- À insérer APRÈS que les utilisateurs soient créés dans auth.users
-- Le trigger handle_new_user crée automatiquement un profil vide,
-- donc utiliser UPDATE au lieu de INSERT
-- ============================================

-- Profile pour pierre.kabore@gmail.com
UPDATE public.profiles SET
  company_name = 'luceka',
  phone = '0617912029',
  billing_address = '345 ch de l''espero',
  billing_city = 'Aix-en-Provence',
  billing_postal_code = '13090',
  shipping_address = '345 ch de l''espero',
  shipping_city = 'Aix-en-Provence',
  shipping_postal_code = '13090',
  same_as_billing = true,
  marketing_consent = false,
  newsletter_consent = false,
  siret = ''
WHERE user_id = '972f7326-923c-4d86-a6cb-c2923f649e71';

-- Profile pour christophe.kabore@gmail.com
UPDATE public.profiles SET
  company_name = NULL,
  phone = NULL,
  billing_address = NULL,
  billing_city = NULL,
  billing_postal_code = NULL,
  shipping_address = NULL,
  shipping_city = NULL,
  shipping_postal_code = NULL,
  same_as_billing = true,
  marketing_consent = false,
  newsletter_consent = false,
  siret = NULL
WHERE user_id = 'af0d0ef6-ce1e-458d-ad39-5517bbb72567';

-- Profile pour kaborematthieu@gmail.com
UPDATE public.profiles SET
  company_name = 'Matthieu Kabore',
  phone = '0608752882',
  billing_address = '17 boulevard de l''Ouest',
  billing_city = 'Dijon',
  billing_postal_code = '21000',
  shipping_address = '17 boulevard de l''Ouest',
  shipping_city = 'Dijon',
  shipping_postal_code = '21000',
  same_as_billing = true,
  marketing_consent = false,
  newsletter_consent = false,
  siret = ''
WHERE user_id = 'cc30cf8f-2722-49ac-a348-11bc087dc1fe';

-- ============================================
-- USER_ROLES (3 administrateurs)
-- À insérer APRÈS que les utilisateurs soient créés
-- ============================================

-- Rôle admin pour pierre.kabore@gmail.com
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('60bbe94c-0d27-4849-b7ae-b60b0654f628', '972f7326-923c-4d86-a6cb-c2923f649e71', 'admin', '2025-12-15T10:22:50.327004+00:00')
ON CONFLICT (user_id, role) DO NOTHING;

-- Rôle admin pour christophe.kabore@gmail.com
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('253c576b-f3d4-449b-acfb-fa82a70e87a3', 'af0d0ef6-ce1e-458d-ad39-5517bbb72567', 'admin', '2025-12-15T10:22:50.327004+00:00')
ON CONFLICT (user_id, role) DO NOTHING;

-- Rôle admin pour kaborematthieu@gmail.com
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
('65d5c687-3ace-4b9d-812f-c2b537f7f000', 'cc30cf8f-2722-49ac-a348-11bc087dc1fe', 'admin', '2025-12-30T22:01:45.667705+00:00')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================
-- USER_CARTS (3 paniers)
-- Données temporaires - optionnel pour la restauration
-- ============================================

-- Panier pour kaborematthieu@gmail.com
INSERT INTO public.user_carts (id, user_id, items, created_at, updated_at) VALUES
('393156bd-bd04-4af8-9baa-fe56967f161b', 'cc30cf8f-2722-49ac-a348-11bc087dc1fe', 
'[{"handle":"vbf30013","id":"bc59bd3c-4ce5-4a94-a6c0-d27bef5b455f","image":"https://dvifxaygfrhhzmnmyiyp.supabase.co/storage/v1/object/public/product-images/1766060065525-88jcgek8e09.jpg","priceHT":10,"quantity":1,"title":"Vis à bois VBF 3,0 x 13","variantId":"bc59bd3c-4ce5-4a94-a6c0-d27bef5b455f","variantTitle":"Default"},{"handle":"vbf10120","id":"e3a8705e-69b6-4c11-acf2-7fd8bbd34b4f","image":"https://dvifxaygfrhhzmnmyiyp.supabase.co/storage/v1/object/public/product-images/1766060065525-88jcgek8e09.jpg","priceHT":31,"quantity":1,"title":"Vis à bois VBF 10,0 x 120 +","variantId":"e3a8705e-69b6-4c11-acf2-7fd8bbd34b4f-unit","variantTitle":"Unité"}]',
'2025-12-31T10:54:31.287922+00:00', '2026-01-04T19:25:49.412749+00:00')
ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = EXCLUDED.updated_at;

-- Panier pour pierre.kabore@gmail.com
INSERT INTO public.user_carts (id, user_id, items, created_at, updated_at) VALUES
('6c8426d5-df92-4e99-8c75-560ac973fb99', '972f7326-923c-4d86-a6cb-c2923f649e71',
'[{"handle":"qs5080tx","id":"57916fcb-12b1-4af5-be70-0bdb4e12681a","image":"https://dvifxaygfrhhzmnmyiyp.supabase.co/storage/v1/object/public/product-images/1766060230951-c3sqkb2k979.JPG","priceHT":30,"quantity":1,"title":"VTI QS 5 x 80","variantId":"57916fcb-12b1-4af5-be70-0bdb4e12681a","variantTitle":"Default"}]',
'2026-01-01T10:27:30.711635+00:00', '2026-01-04T20:06:21.481883+00:00')
ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = EXCLUDED.updated_at;

-- Panier pour christophe.kabore@gmail.com
INSERT INTO public.user_carts (id, user_id, items, created_at, updated_at) VALUES
('be546f48-d4ff-4b52-8fab-34d0b65f52c7', 'af0d0ef6-ce1e-458d-ad39-5517bbb72567',
'[{"handle":"qs5040tx","id":"f7eda11b-151c-4faa-8750-8e1a61537e39","image":"https://dvifxaygfrhhzmnmyiyp.supabase.co/storage/v1/object/public/product-images/1766060230951-c3sqkb2k979.JPG","priceHT":13,"quantity":1,"title":"Vis terrasse QS 5 x 40","variantId":"f7eda11b-151c-4faa-8750-8e1a61537e39","variantTitle":"Default"}]',
'2026-01-03T10:46:22.249436+00:00', '2026-01-03T15:21:06.122627+00:00')
ON CONFLICT (user_id) DO UPDATE SET items = EXCLUDED.items, updated_at = EXCLUDED.updated_at;

-- ============================================
-- PROCÉDURE DE RESTAURATION DES UTILISATEURS
-- ============================================
-- 1. Créer les utilisateurs via Supabase Dashboard ou API Auth:
--    - pierre.kabore@gmail.com
--    - christophe.kabore@gmail.com  
--    - kaborematthieu@gmail.com
--
-- 2. Noter les nouveaux user_ids générés
--
-- 3. Mettre à jour les user_ids dans ce script si différents
--
-- 4. Exécuter les UPDATE profiles (le trigger crée les profils vides)
--
-- 5. Exécuter les INSERT user_roles pour attribuer les droits admin
--
-- 6. Optionnel: Exécuter les INSERT user_carts
-- ============================================

-- FIN DE L'EXPORT UTILISATEURS
