-- Tarif fournisseur Alsafix (import Excel régulier) — jointure Pricing via code_alsafix
SET search_path TO kpmc, public;

CREATE TABLE IF NOT EXISTS kpmc.pricing_tarif_alsafix (
  id BIGSERIAL PRIMARY KEY,
  code_alsafix TEXT NOT NULL,
  designation_fr TEXT NOT NULL DEFAULT '',
  description_eng TEXT NOT NULL DEFAULT '',
  bezeichnung_de TEXT NOT NULL DEFAULT '',
  code_famille TEXT NOT NULL DEFAULT '',
  code_gamme INTEGER,
  code_ean TEXT NOT NULL DEFAULT '',
  code_douanier TEXT NOT NULL DEFAULT '',
  pays_origine TEXT NOT NULL DEFAULT '',
  cond_1 BIGINT,
  cond_2 BIGINT,
  cond_3 BIGINT,
  unite TEXT NOT NULL DEFAULT '',
  poids_kg NUMERIC(14, 4),
  prix_ht_tarif_2026 NUMERIC(14, 4),
  code_remise TEXT NOT NULL DEFAULT '',
  prix_3k_2026 NUMERIC(14, 4),
  prix_tarif_ht_unitaire NUMERIC(14, 4),
  prix_ht_tarif_par_boite NUMERIC(14, 4),
  prix_revendeurs_fr_par_boite NUMERIC(14, 4),
  prix_3k_ht_unitaire NUMERIC(14, 4),
  prix_ht_boite_3k NUMERIC(14, 4),
  source_filename TEXT NOT NULL DEFAULT '',
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pricing_tarif_alsafix_code_unique UNIQUE (code_alsafix)
);

CREATE INDEX IF NOT EXISTS idx_pricing_tarif_alsafix_famille
  ON kpmc.pricing_tarif_alsafix (code_famille);

COMMENT ON TABLE kpmc.pricing_tarif_alsafix IS
  'Référentiel tarif Alsafix importé (Excel). Clé métier code_alsafix = public.products.code_alsafix.';

COMMENT ON COLUMN kpmc.pricing_tarif_alsafix.code_alsafix IS
  'Code produit Alsafix — identique à public.products.code_alsafix pour enrichir la grille Pricing.';

ALTER TABLE kpmc.pricing_tarif_alsafix ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage pricing_tarif_alsafix" ON kpmc.pricing_tarif_alsafix;
CREATE POLICY "KPMC admins manage pricing_tarif_alsafix" ON kpmc.pricing_tarif_alsafix
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.pricing_tarif_alsafix TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.pricing_tarif_alsafix_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
