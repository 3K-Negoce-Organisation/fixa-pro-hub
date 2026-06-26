-- Lot 2 — Factures clients & fournisseurs KPMC (v1 React)

CREATE TABLE IF NOT EXISTS kpmc.factures_clients (
  id BIGSERIAL PRIMARY KEY,
  numero_facture TEXT NOT NULL,
  commande_ref TEXT,
  date_facture DATE NOT NULL,
  date_livraison DATE,
  client_nom TEXT NOT NULL DEFAULT '',
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  frais_port_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  devise CHAR(3) NOT NULL DEFAULT 'EUR',
  montant_devise NUMERIC(12,2),
  taux_change NUMERIC(10,6),
  frais_qonto_eur NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'validee'
    CHECK (statut IN ('brouillon', 'en_attente', 'validee', 'paye')),
  date_paiement DATE,
  luceka_refacture_id BIGINT REFERENCES kpmc.luceka_refactures(id) ON DELETE SET NULL,
  transaction_validee BOOLEAN NOT NULL DEFAULT FALSE,
  transaction_validee_le TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uk_kpmc_fc_numero UNIQUE (numero_facture)
);

CREATE INDEX IF NOT EXISTS idx_kpmc_fc_date ON kpmc.factures_clients(date_facture);
CREATE INDEX IF NOT EXISTS idx_kpmc_fc_statut ON kpmc.factures_clients(statut);
CREATE INDEX IF NOT EXISTS idx_kpmc_fc_commande_ref ON kpmc.factures_clients(commande_ref);

CREATE TABLE IF NOT EXISTS kpmc.factures_clients_lignes (
  id BIGSERIAL PRIMARY KEY,
  facture_id BIGINT NOT NULL REFERENCES kpmc.factures_clients(id) ON DELETE CASCADE,
  produit TEXT NOT NULL DEFAULT '',
  quantite INTEGER NOT NULL DEFAULT 1,
  prix_unitaire_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  ligne_ordre SMALLINT NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_kpmc_fcl_facture ON kpmc.factures_clients_lignes(facture_id);

CREATE TABLE IF NOT EXISTS kpmc.factures_fournisseurs (
  id BIGSERIAL PRIMARY KEY,
  fournisseur_nom TEXT NOT NULL DEFAULT '',
  numero_facture TEXT NOT NULL,
  date_facture DATE NOT NULL,
  date_echeance DATE,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_payer'
    CHECK (statut IN ('a_payer', 'payee')),
  date_paiement DATE,
  facture_mode TEXT NOT NULL DEFAULT 'unique'
    CHECK (facture_mode IN ('unique', 'echelonne')),
  periode_service_debut DATE,
  periode_service_fin DATE,
  document_id BIGINT,
  charge_recurrente_id BIGINT REFERENCES kpmc.charges_recurrentes(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_ff_date ON kpmc.factures_fournisseurs(date_facture);
CREATE INDEX IF NOT EXISTS idx_kpmc_ff_statut ON kpmc.factures_fournisseurs(statut);

CREATE TABLE IF NOT EXISTS kpmc.factures_fournisseurs_echeances (
  id BIGSERIAL PRIMARY KEY,
  facture_id BIGINT NOT NULL REFERENCES kpmc.factures_fournisseurs(id) ON DELETE CASCADE,
  ligne_ordre SMALLINT NOT NULL DEFAULT 1,
  date_echeance DATE NOT NULL,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_payer'
    CHECK (statut IN ('a_payer', 'payee')),
  mode_paiement TEXT NOT NULL DEFAULT 'societe',
  date_paiement DATE,
  UNIQUE (facture_id, ligne_ordre)
);

-- Lien bidirectionnel Luceka ↔ facture client
ALTER TABLE kpmc.luceka_refactures
  ADD COLUMN IF NOT EXISTS facture_client_id BIGINT REFERENCES kpmc.factures_clients(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_kpmc_luceka_facture_client
  ON kpmc.luceka_refactures(facture_client_id) WHERE facture_client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_kpmc_fc_luceka_ref
  ON kpmc.factures_clients(luceka_refacture_id) WHERE luceka_refacture_id IS NOT NULL;

-- RLS
ALTER TABLE kpmc.factures_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.factures_clients_lignes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.factures_fournisseurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.factures_fournisseurs_echeances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage factures_clients" ON kpmc.factures_clients;
CREATE POLICY "KPMC admins manage factures_clients"
  ON kpmc.factures_clients FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage factures_clients_lignes" ON kpmc.factures_clients_lignes;
CREATE POLICY "KPMC admins manage factures_clients_lignes"
  ON kpmc.factures_clients_lignes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage factures_fournisseurs" ON kpmc.factures_fournisseurs;
CREATE POLICY "KPMC admins manage factures_fournisseurs"
  ON kpmc.factures_fournisseurs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage factures_fournisseurs_echeances" ON kpmc.factures_fournisseurs_echeances;
CREATE POLICY "KPMC admins manage factures_fournisseurs_echeances"
  ON kpmc.factures_fournisseurs_echeances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON
  kpmc.factures_clients,
  kpmc.factures_clients_lignes,
  kpmc.factures_fournisseurs,
  kpmc.factures_fournisseurs_echeances
  TO authenticated, service_role;

GRANT USAGE, SELECT ON SEQUENCE
  kpmc.factures_clients_id_seq,
  kpmc.factures_clients_lignes_id_seq,
  kpmc.factures_fournisseurs_id_seq,
  kpmc.factures_fournisseurs_echeances_id_seq
  TO authenticated, service_role;
