-- Lot 2 — Avances associés KPMC

CREATE TABLE IF NOT EXISTS kpmc.associes (
  id BIGSERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_associes_auth_user ON kpmc.associes(auth_user_id);

CREATE TABLE IF NOT EXISTS kpmc.associes_avances (
  id BIGSERIAL PRIMARY KEY,
  associe_id BIGINT NOT NULL REFERENCES kpmc.associes(id) ON DELETE CASCADE,
  date_operation DATE NOT NULL,
  type_avance TEXT NOT NULL DEFAULT 'autre'
    CHECK (type_avance IN ('frais_personnel', 'facture_payee', 'temps_travail', 'autre')),
  description TEXT,
  montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'rembourse')),
  date_remboursement DATE,
  document_id BIGINT REFERENCES kpmc.documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kpmc.associes_temps (
  id BIGSERIAL PRIMARY KEY,
  associe_id BIGINT NOT NULL REFERENCES kpmc.associes(id) ON DELETE CASCADE,
  date_travail DATE NOT NULL,
  description TEXT,
  heures NUMERIC(8, 2) NOT NULL DEFAULT 0,
  taux_horaire NUMERIC(12, 2) NOT NULL DEFAULT 0,
  montant NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'en_attente'
    CHECK (statut IN ('en_attente', 'rembourse')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_associes_avances_associe ON kpmc.associes_avances(associe_id);
CREATE INDEX IF NOT EXISTS idx_kpmc_associes_avances_statut ON kpmc.associes_avances(statut);
CREATE INDEX IF NOT EXISTS idx_kpmc_associes_temps_associe ON kpmc.associes_temps(associe_id);

INSERT INTO kpmc.associes (nom, role)
SELECT v.nom, v.role
FROM (VALUES
  ('Matthieu', 'Fondateur'),
  ('Pierre', 'Fondateur'),
  ('Myriam', 'Fondatrice')
) AS v(nom, role)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.associes LIMIT 1);

INSERT INTO kpmc.fiscalite_parametres (nom_parametre, valeur, description)
SELECT 'taux_horaire_associe', 0::numeric, 'Taux horaire par défaut (€/h) pour le temps des associés'
WHERE NOT EXISTS (
  SELECT 1 FROM kpmc.fiscalite_parametres WHERE nom_parametre = 'taux_horaire_associe'
);

ALTER TABLE kpmc.associes ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.associes_avances ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.associes_temps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage associes" ON kpmc.associes;
CREATE POLICY "KPMC admins manage associes"
  ON kpmc.associes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage associes_avances" ON kpmc.associes_avances;
CREATE POLICY "KPMC admins manage associes_avances"
  ON kpmc.associes_avances FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage associes_temps" ON kpmc.associes_temps;
CREATE POLICY "KPMC admins manage associes_temps"
  ON kpmc.associes_temps FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.associes TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.associes_avances TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.associes_temps TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.associes_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.associes_avances_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.associes_temps_id_seq TO authenticated, service_role;
