-- Lot 2 — Impôts & Taxes KPMC (fiscalite_parametres + fiscalite_echeances)

CREATE TABLE IF NOT EXISTS kpmc.fiscalite_parametres (
  id BIGSERIAL PRIMARY KEY,
  nom_parametre TEXT NOT NULL UNIQUE,
  valeur NUMERIC(12, 2) NOT NULL DEFAULT 0,
  description TEXT
);

CREATE TABLE IF NOT EXISTS kpmc.fiscalite_echeances (
  id BIGSERIAL PRIMARY KEY,
  type_impot TEXT NOT NULL,
  date_echeance DATE NOT NULL,
  montant_estime NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'a_payer'
    CHECK (statut IN ('a_payer', 'paye')),
  annee INTEGER
);

CREATE INDEX IF NOT EXISTS idx_kpmc_fiscalite_echeances_date ON kpmc.fiscalite_echeances(date_echeance);

INSERT INTO kpmc.fiscalite_parametres (nom_parametre, valeur, description)
SELECT v.nom, v.val, v.descr
FROM (VALUES
  ('taux_tva_standard', 20::numeric, 'Taux TVA standard (%)'),
  ('taux_is_reduit', 15::numeric, 'Taux IS tranche réduite (%)'),
  ('taux_is_normal', 25::numeric, 'Taux IS tranche normale (%)'),
  ('seuil_is_reduit', 42500::numeric, 'Seuil bénéfice pour IS réduit (€)'),
  ('estimation_cfe', 800::numeric, 'CFE estimée annuelle (€)'),
  ('taux_charges_dirigeant', 45::numeric, 'Taux cotisations sociales dirigeant (%)'),
  ('remuneration_dirigeant', 0::numeric, 'Rémunération annuelle dirigeant (€)')
) AS v(nom, val, descr)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.fiscalite_parametres LIMIT 1);

ALTER TABLE kpmc.fiscalite_parametres ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.fiscalite_echeances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage fiscalite_parametres" ON kpmc.fiscalite_parametres;
CREATE POLICY "KPMC admins manage fiscalite_parametres"
  ON kpmc.fiscalite_parametres FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage fiscalite_echeances" ON kpmc.fiscalite_echeances;
CREATE POLICY "KPMC admins manage fiscalite_echeances"
  ON kpmc.fiscalite_echeances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.fiscalite_parametres TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.fiscalite_echeances TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.fiscalite_parametres_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.fiscalite_echeances_id_seq TO authenticated, service_role;
