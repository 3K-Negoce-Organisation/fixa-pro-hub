-- Fiches fournisseurs (référentiel achats / facturation KPMC)
SET search_path TO kpmc, public;

CREATE TABLE IF NOT EXISTS kpmc.fournisseurs (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  code_interne TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  telephone TEXT NOT NULL DEFAULT '',
  adresse TEXT NOT NULL DEFAULT '',
  code_postal TEXT NOT NULL DEFAULT '',
  ville TEXT NOT NULL DEFAULT '',
  pays TEXT NOT NULL DEFAULT 'France',
  siret TEXT NOT NULL DEFAULT '',
  tva_intracom TEXT NOT NULL DEFAULT '',
  contact_principal TEXT NOT NULL DEFAULT '',
  site_web TEXT NOT NULL DEFAULT '',
  notes TEXT,
  actif BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fournisseurs_nom ON kpmc.fournisseurs (nom);
CREATE INDEX IF NOT EXISTS idx_fournisseurs_code_interne ON kpmc.fournisseurs (code_interne)
  WHERE code_interne <> '';

COMMENT ON TABLE kpmc.fournisseurs IS
  'Référentiel fournisseurs KPMC (fiches détaillées, distinct de kpmc.tiers).';

ALTER TABLE kpmc.fournisseurs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage fournisseurs" ON kpmc.fournisseurs;
CREATE POLICY "KPMC admins manage fournisseurs" ON kpmc.fournisseurs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.fournisseurs TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.fournisseurs_id_seq TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
