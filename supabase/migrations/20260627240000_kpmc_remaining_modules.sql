-- Lots 2–7 — modules KPMC restants (v1 React)

-- Charges récurrentes
CREATE TABLE IF NOT EXISTS kpmc.charges_recurrentes (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  categorie TEXT NOT NULL DEFAULT 'autre',
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  periodicite TEXT NOT NULL DEFAULT 'mensuel' CHECK (periodicite IN ('mensuel','trimestriel','annuel')),
  date_prochain_paiement DATE,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Répertoire
CREATE TABLE IF NOT EXISTS kpmc.contacts (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL DEFAULT '',
  prenom TEXT NOT NULL DEFAULT '',
  entreprise TEXT NOT NULL DEFAULT '',
  email TEXT,
  telephone TEXT,
  type_relation TEXT NOT NULL DEFAULT 'autre',
  observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.tiers (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'fournisseur' CHECK (type IN ('client','fournisseur','les_deux')),
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Décisions
CREATE TABLE IF NOT EXISTS kpmc.decisions (
  id BIGSERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  objet_consultation TEXT NOT NULL,
  propositions TEXT NOT NULL,
  domaine TEXT NOT NULL DEFAULT 'Autre',
  statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente','prise')),
  date_creation TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_prise TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS kpmc.decision_votes (
  id BIGSERIAL PRIMARY KEY,
  decision_id BIGINT NOT NULL REFERENCES kpmc.decisions(id) ON DELETE CASCADE,
  associe_id BIGINT NOT NULL REFERENCES kpmc.associes(id) ON DELETE CASCADE,
  vote_choix TEXT NOT NULL CHECK (vote_choix IN ('pour','contre','abstention')),
  date_vote TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (decision_id, associe_id)
);

-- Tâches
CREATE TABLE IF NOT EXISTS kpmc.tasks (
  id BIGSERIAL PRIMARY KEY,
  titre TEXT NOT NULL,
  description TEXT,
  type_tache TEXT NOT NULL DEFAULT 'Général',
  statut TEXT NOT NULL DEFAULT 'a_faire',
  priorite TEXT NOT NULL DEFAULT 'normale',
  responsable TEXT,
  date_echeance DATE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Secrets fournisseurs (v1 : stockage admin RLS — chiffrement applicatif ultérieur)
CREATE TABLE IF NOT EXISTS kpmc.supplier_secrets (
  id BIGSERIAL PRIMARY KEY,
  account_label TEXT NOT NULL,
  identifier TEXT NOT NULL DEFAULT '',
  secret_key TEXT NOT NULL DEFAULT '',
  environment TEXT NOT NULL DEFAULT 'production',
  commentaire TEXT,
  password_blob TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stripe miroir
CREATE TABLE IF NOT EXISTS kpmc.stripe_balance (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  available NUMERIC(14,2) NOT NULL DEFAULT 0,
  pending NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  last_sync_at TIMESTAMPTZ
);

INSERT INTO kpmc.stripe_balance (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS kpmc.stripe_charges (
  id TEXT PRIMARY KEY,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_refunded NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT '',
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  customer_email TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.stripe_payouts (
  id TEXT PRIMARY KEY,
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT '',
  arrival_date DATE,
  created_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.stripe_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  ok BOOLEAN NOT NULL DEFAULT FALSE,
  charges INTEGER NOT NULL DEFAULT 0,
  payouts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT ''
);

-- Luceka
CREATE TABLE IF NOT EXISTS kpmc.luceka_refacturation_param (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  marge_pct NUMERIC(6,2) NOT NULL DEFAULT 15,
  plafond_marge_mensuel NUMERIC(12,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO kpmc.luceka_refacturation_param (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS kpmc.luceka_refactures (
  id BIGSERIAL PRIMARY KEY,
  numero_facture_alsafix TEXT NOT NULL,
  date_facture DATE NOT NULL,
  commande_ref TEXT,
  fournisseur_nom TEXT NOT NULL DEFAULT 'Alsafix',
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_marge NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_du_luceka NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Mail (cache local, sync IMAP ultérieur)
CREATE TABLE IF NOT EXISTS kpmc.mail_box_items (
  id BIGSERIAL PRIMARY KEY,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  from_email TEXT NOT NULL DEFAULT '',
  to_emails TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body_text TEXT,
  message_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pricing
CREATE TABLE IF NOT EXISTS kpmc.pricing_products (
  id BIGSERIAL PRIMARY KEY,
  code_alsafix TEXT NOT NULL UNIQUE,
  designation_fr TEXT NOT NULL DEFAULT '',
  prix_achat_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  prix_vente_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  marge_souhaitee NUMERIC(6,2),
  categorie TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.pricing_margin_rule (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  surplus_pct NUMERIC(6,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO kpmc.pricing_margin_rule (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Réunions (JSON document)
CREATE TABLE IF NOT EXISTS kpmc.reunions_themes (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  content_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Paramètres listes
CREATE TABLE IF NOT EXISTS kpmc.param_listes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  libelle TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kpmc.param_liste_items (
  id BIGSERIAL PRIMARY KEY,
  list_id BIGINT NOT NULL REFERENCES kpmc.param_listes(id) ON DELETE CASCADE,
  valeur TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 10,
  categorie TEXT
);

INSERT INTO kpmc.param_listes (code, libelle, ordre)
SELECT v.code, v.libelle, v.ordre FROM (VALUES
  ('decision_domaine', 'Domaine de décision', 20),
  ('compta_type_operation', 'Types opération compta', 10)
) AS v(code, libelle, ordre)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.param_listes LIMIT 1);

-- RLS helper : admin policies on all new tables
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'charges_recurrentes','contacts','tiers','decisions','decision_votes','tasks',
    'supplier_secrets','stripe_balance','stripe_charges','stripe_payouts','stripe_sync_logs',
    'luceka_refacturation_param','luceka_refactures','mail_box_items',
    'pricing_products','pricing_margin_rule','reunions_themes',
    'param_listes','param_liste_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE kpmc.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "KPMC admins manage %s" ON kpmc.%I', t, t);
    EXECUTE format(
      'CREATE POLICY "KPMC admins manage %s" ON kpmc.%I FOR ALL
       USING (public.has_role(auth.uid(), ''admin''::public.app_role))
       WITH CHECK (public.has_role(auth.uid(), ''admin''::public.app_role))',
      t, t
    );
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.%I TO authenticated, service_role', t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA kpmc TO authenticated, service_role;
