-- Lot 2 — Qonto (miroir sync API compta)

CREATE TABLE IF NOT EXISTS kpmc.qonto_bank_accounts (
  id TEXT PRIMARY KEY,
  iban TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  balance NUMERIC(14,2) NOT NULL DEFAULT 0,
  authorized_balance NUMERIC(14,2),
  last_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.qonto_transactions (
  id TEXT PRIMARY KEY,
  bank_account_id TEXT NOT NULL REFERENCES kpmc.qonto_bank_accounts(id) ON DELETE CASCADE,
  emitted_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  side TEXT NOT NULL DEFAULT 'debit' CHECK (side IN ('debit', 'credit')),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  label TEXT NOT NULL DEFAULT '',
  reference TEXT NOT NULL DEFAULT '',
  operation_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',
  attachment_count SMALLINT NOT NULL DEFAULT 0,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_qonto_tx_account ON kpmc.qonto_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_kpmc_qonto_tx_settled ON kpmc.qonto_transactions(settled_at DESC);

CREATE TABLE IF NOT EXISTS kpmc.qonto_sync_logs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  trigger_type TEXT NOT NULL DEFAULT 'auto',
  ok BOOLEAN NOT NULL DEFAULT FALSE,
  accounts INTEGER NOT NULL DEFAULT 0,
  imported INTEGER NOT NULL DEFAULT 0,
  error_message TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_kpmc_qonto_sync_started ON kpmc.qonto_sync_logs(started_at DESC);

CREATE TABLE IF NOT EXISTS kpmc.qonto_ecriture_brouillons (
  id BIGSERIAL PRIMARY KEY,
  qonto_transaction_id TEXT NOT NULL UNIQUE REFERENCES kpmc.qonto_transactions(id) ON DELETE CASCADE,
  statut TEXT NOT NULL DEFAULT 'propose'
    CHECK (statut IN ('a_traiter', 'propose', 'pj_attente', 'valide', 'ignore', 'erreur')),
  ecriture_id BIGINT REFERENCES kpmc.compta_ecritures(id) ON DELETE SET NULL,
  date_ecriture DATE NOT NULL,
  type_operation TEXT NOT NULL,
  tiers TEXT NOT NULL DEFAULT '',
  description TEXT,
  montant_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  tva NUMERIC(12,2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  sens TEXT NOT NULL DEFAULT 'entree' CHECK (sens IN ('entree', 'sortie')),
  mode_paiement TEXT NOT NULL DEFAULT 'Virement',
  statut_ecriture TEXT NOT NULL DEFAULT 'paye',
  regle_appliquee TEXT,
  confiance TEXT NOT NULL DEFAULT 'moyenne' CHECK (confiance IN ('haute', 'moyenne', 'basse')),
  pj_path TEXT,
  pj_source TEXT NOT NULL DEFAULT 'aucune' CHECK (pj_source IN ('aucune', 'upload')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  validated_at TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_kpmc_qeb_statut ON kpmc.qonto_ecriture_brouillons(statut);
CREATE INDEX IF NOT EXISTS idx_kpmc_qeb_date ON kpmc.qonto_ecriture_brouillons(date_ecriture);

ALTER TABLE kpmc.qonto_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.qonto_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.qonto_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.qonto_ecriture_brouillons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage qonto_bank_accounts" ON kpmc.qonto_bank_accounts;
CREATE POLICY "KPMC admins manage qonto_bank_accounts"
  ON kpmc.qonto_bank_accounts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage qonto_transactions" ON kpmc.qonto_transactions;
CREATE POLICY "KPMC admins manage qonto_transactions"
  ON kpmc.qonto_transactions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage qonto_sync_logs" ON kpmc.qonto_sync_logs;
CREATE POLICY "KPMC admins manage qonto_sync_logs"
  ON kpmc.qonto_sync_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage qonto_ecriture_brouillons" ON kpmc.qonto_ecriture_brouillons;
CREATE POLICY "KPMC admins manage qonto_ecriture_brouillons"
  ON kpmc.qonto_ecriture_brouillons FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.qonto_bank_accounts TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.qonto_transactions TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.qonto_sync_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.qonto_ecriture_brouillons TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.qonto_sync_logs_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.qonto_ecriture_brouillons_id_seq TO authenticated, service_role;
