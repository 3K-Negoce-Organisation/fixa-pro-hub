-- KPMC_administration — Lot 1 : schéma isolé kpmc (aucune modification des tables public.* existantes)
-- Holding KPMC / back-office associés — auth partagée admin-hub (auth.users)

CREATE SCHEMA IF NOT EXISTS kpmc;

COMMENT ON SCHEMA kpmc IS 'KPMC_administration — tables holding ; ne pas mélanger avec le e-commerce public.*';

-- Droits menus KPMC (remplace profile_page / user_page_access côté Supabase)
CREATE TABLE IF NOT EXISTS kpmc.page_access (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, page_key)
);

CREATE INDEX IF NOT EXISTS idx_kpmc_page_access_page_key ON kpmc.page_access(page_key);

-- Pont transition MySQL simthok → auth.users (Lot 1)
CREATE TABLE IF NOT EXISTS kpmc.auth_user_links (
  id BIGSERIAL PRIMARY KEY,
  legacy_mysql_user_id INTEGER,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kpmc_auth_user_links_legacy_unique UNIQUE (legacy_mysql_user_id),
  CONSTRAINT kpmc_auth_user_links_auth_unique UNIQUE (auth_user_id)
);

-- Préférences UI KPMC hors colonnes profiles e-commerce
CREATE TABLE IF NOT EXISTS kpmc.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suivi migration KPMC → Supabase (miroir du manifest + UI)
CREATE TABLE IF NOT EXISTS kpmc.migration_lots (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'blocked')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.migration_items (
  id BIGSERIAL PRIMARY KEY,
  lot_id INTEGER NOT NULL REFERENCES kpmc.migration_lots(id) ON DELETE CASCADE,
  menu_key TEXT NOT NULL,
  label TEXT NOT NULL,
  action_code CHAR(1) NOT NULL CHECK (action_code IN ('R', 'L', 'C', 'A', 'S', '-')),
  supabase_target TEXT NOT NULL DEFAULT '',
  migrate_data BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'blocked', 'skipped')),
  notes TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lot_id, menu_key)
);

CREATE INDEX IF NOT EXISTS idx_kpmc_migration_items_status ON kpmc.migration_items(status);

-- RLS : admins 3K uniquement (même règle que supplier_settings)
ALTER TABLE kpmc.page_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.auth_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.migration_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.migration_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage page_access" ON kpmc.page_access;
CREATE POLICY "KPMC admins manage page_access"
  ON kpmc.page_access FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage auth_user_links" ON kpmc.auth_user_links;
CREATE POLICY "KPMC admins manage auth_user_links"
  ON kpmc.auth_user_links FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC users own preferences" ON kpmc.user_preferences;
CREATE POLICY "KPMC users own preferences"
  ON kpmc.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "KPMC admins manage migration_lots" ON kpmc.migration_lots;
CREATE POLICY "KPMC admins manage migration_lots"
  ON kpmc.migration_lots FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage migration_items" ON kpmc.migration_items;
CREATE POLICY "KPMC admins manage migration_items"
  ON kpmc.migration_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT USAGE ON SCHEMA kpmc TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA kpmc TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kpmc TO authenticated, service_role;

-- Lot 1 : statut initial
INSERT INTO kpmc.migration_lots (id, slug, title, description, sort_order, status)
VALUES
  (1, 'auth', 'Auth & droits', 'Supabase Auth partagé admin-hub, kpmc.page_access, suivi migration', 10, 'in_progress'),
  (2, 'compta', 'Comptabilité & trésorerie', 'Compta, Qonto, Stripe sync, factures', 20, 'pending'),
  (3, 'luceka', 'Refacturation Luceka', 'Lien lecture public.orders', 30, 'pending'),
  (4, 'documents', 'Documents & Storage', 'GED holding + buckets dédiés', 40, 'pending'),
  (5, 'governance', 'Tâches, décisions, réunions', 'Collaboration associés', 50, 'pending'),
  (6, 'crm', 'Calendrier, répertoire, mail', 'Famille + CRM + cache IMAP', 60, 'pending'),
  (7, 'holding', 'Info 3K, secrets, pricing', 'Fiche holding et outils', 70, 'pending')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order;

INSERT INTO kpmc.migration_items (lot_id, menu_key, label, action_code, supabase_target, migrate_data, status, notes)
VALUES
  (1, 'auth_login', 'Connexion Supabase (auth.users)', 'A', 'auth.users + public.user_roles', FALSE, 'in_progress', 'Même login que admin-hub — 3 associés'),
  (1, 'parametres_droits_acces', 'Droits menus KPMC', 'C', 'kpmc.page_access', TRUE, 'in_progress', 'Remplace profile_page / user_page_access'),
  (1, 'migration', 'Menu suivi migration', 'C', 'kpmc.migration_lots + kpmc.migration_items', FALSE, 'done', 'Lot 1 — UI KPMC'),
  (1, 'parametres_compte', 'Mon compte', 'A', 'public.profiles + kpmc.user_preferences', TRUE, 'pending', ''),
  (1, 'auth_user_links', 'Pont utilisateurs MySQL → auth', 'C', 'kpmc.auth_user_links', TRUE, 'pending', 'Transition Hostinger')
ON CONFLICT (lot_id, menu_key) DO NOTHING;
