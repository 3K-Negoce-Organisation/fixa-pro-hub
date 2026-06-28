-- Lot 2 — Comptabilité KPMC (écritures, v1)

CREATE TABLE IF NOT EXISTS kpmc.compta_ecritures (
  id BIGSERIAL PRIMARY KEY,
  date_ecriture DATE NOT NULL,
  type_operation TEXT NOT NULL,
  tiers TEXT NOT NULL DEFAULT '',
  description TEXT,
  montant_ht NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tva NUMERIC(12, 2) NOT NULL DEFAULT 0,
  montant_ttc NUMERIC(12, 2) NOT NULL DEFAULT 0,
  sens TEXT NOT NULL DEFAULT 'entree'
    CHECK (sens IN ('entree', 'sortie')),
  mode_paiement TEXT NOT NULL DEFAULT 'Virement',
  statut TEXT NOT NULL DEFAULT 'paye'
    CHECK (statut IN ('paye', 'a_payer')),
  facture_id BIGINT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_compta_ecritures_date ON kpmc.compta_ecritures(date_ecriture);
CREATE INDEX IF NOT EXISTS idx_kpmc_compta_ecritures_type ON kpmc.compta_ecritures(type_operation);

ALTER TABLE kpmc.compta_ecritures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage compta_ecritures" ON kpmc.compta_ecritures;
CREATE POLICY "KPMC admins manage compta_ecritures"
  ON kpmc.compta_ecritures FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.compta_ecritures TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.compta_ecritures_id_seq TO authenticated, service_role;
