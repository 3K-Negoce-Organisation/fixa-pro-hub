-- KPMC — entités légales (sociétés holding + sites vitrine) pour les fiches juridiques.

CREATE TABLE IF NOT EXISTS kpmc.legal_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('societe', 'site')),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT legal_entities_kind_site CHECK (
    (kind = 'site' AND site_id IS NOT NULL) OR
    (kind = 'societe' AND site_id IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_kpmc_legal_entities_site
  ON kpmc.legal_entities(site_id)
  WHERE site_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_kpmc_legal_entities_kind_name
  ON kpmc.legal_entities(kind, name);

ALTER TABLE kpmc.legal_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage legal_entities" ON kpmc.legal_entities;
CREATE POLICY "KPMC admins manage legal_entities"
  ON kpmc.legal_entities FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC authenticated read legal_entities" ON kpmc.legal_entities;
CREATE POLICY "KPMC authenticated read legal_entities"
  ON kpmc.legal_entities FOR SELECT
  TO authenticated
  USING (is_active = true);

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.legal_entities TO authenticated, service_role;

-- Holding 3K-Négoce
INSERT INTO kpmc.legal_entities (slug, name, kind, site_id)
VALUES ('3k-negoce', '3K-Négoce', 'societe', NULL)
ON CONFLICT (slug) DO NOTHING;

-- Sites vitrine (tous, pour rattacher l'historique des révisions)
INSERT INTO kpmc.legal_entities (slug, name, kind, site_id, is_active)
SELECT s.slug, s.name, 'site', s.id, s.is_active
FROM public.sites s
ON CONFLICT (slug) DO UPDATE
  SET site_id = EXCLUDED.site_id,
      name = EXCLUDED.name,
      is_active = EXCLUDED.is_active;

-- Lier les révisions existantes à une entité légale
ALTER TABLE kpmc.company_info_revisions
  ADD COLUMN IF NOT EXISTS legal_entity_id UUID REFERENCES kpmc.legal_entities(id) ON DELETE CASCADE;

UPDATE kpmc.company_info_revisions r
SET legal_entity_id = e.id
FROM kpmc.legal_entities e
WHERE r.legal_entity_id IS NULL
  AND r.site_id IS NULL
  AND e.slug = '3k-negoce';

UPDATE kpmc.company_info_revisions r
SET legal_entity_id = e.id
FROM kpmc.legal_entities e
WHERE r.legal_entity_id IS NULL
  AND r.site_id IS NOT NULL
  AND e.site_id = r.site_id;

ALTER TABLE kpmc.company_info_revisions
  ALTER COLUMN legal_entity_id SET NOT NULL;

DROP INDEX IF EXISTS kpmc.uk_kpmc_company_info_holding_version;
DROP INDEX IF EXISTS kpmc.uk_kpmc_company_info_site_version;

CREATE UNIQUE INDEX IF NOT EXISTS uk_kpmc_company_info_entity_version
  ON kpmc.company_info_revisions(legal_entity_id, version);

CREATE INDEX IF NOT EXISTS idx_kpmc_company_info_revisions_entity
  ON kpmc.company_info_revisions(legal_entity_id, version DESC);

ALTER TABLE kpmc.company_info_revisions
  DROP COLUMN IF EXISTS site_id;

CREATE OR REPLACE FUNCTION kpmc.company_info_save_revision(
  p_payload JSONB,
  p_comment TEXT DEFAULT NULL,
  p_legal_entity_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kpmc, public
AS $$
DECLARE
  v_next INTEGER;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Droits administrateur requis';
  END IF;

  IF p_legal_entity_id IS NULL THEN
    RAISE EXCEPTION 'Entité légale requise';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM kpmc.legal_entities
    WHERE id = p_legal_entity_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Entité légale inconnue';
  END IF;

  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM kpmc.company_info_revisions
  WHERE legal_entity_id = p_legal_entity_id;

  INSERT INTO kpmc.company_info_revisions (legal_entity_id, version, user_id, commentaire, payload_json)
  VALUES (p_legal_entity_id, v_next, uid, NULLIF(TRIM(p_comment), ''), COALESCE(p_payload, '{}'::jsonb));

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION kpmc.company_info_save_revision(JSONB, TEXT, UUID) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION kpmc.legal_entity_create(
  p_slug TEXT,
  p_name TEXT,
  p_kind TEXT,
  p_site_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = kpmc, public
AS $$
DECLARE
  v_id UUID;
  v_slug TEXT;
  v_name TEXT;
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL OR NOT public.has_role(uid, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Droits administrateur requis';
  END IF;

  v_slug := lower(trim(p_slug));
  v_name := trim(p_name);

  IF v_slug = '' OR v_name = '' THEN
    RAISE EXCEPTION 'Nom et identifiant requis';
  END IF;

  IF p_kind NOT IN ('societe', 'site') THEN
    RAISE EXCEPTION 'Type invalide';
  END IF;

  IF p_kind = 'site' THEN
    IF p_site_id IS NULL THEN
      RAISE EXCEPTION 'Site vitrine requis';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.sites WHERE id = p_site_id) THEN
      RAISE EXCEPTION 'Site vitrine inconnu';
    END IF;
  ELSIF p_site_id IS NOT NULL THEN
    RAISE EXCEPTION 'Une société ne peut pas être liée à un site';
  END IF;

  IF EXISTS (SELECT 1 FROM kpmc.legal_entities WHERE slug = v_slug) THEN
    RAISE EXCEPTION 'Cet identifiant existe déjà';
  END IF;

  INSERT INTO kpmc.legal_entities (slug, name, kind, site_id)
  VALUES (v_slug, v_name, p_kind, p_site_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION kpmc.legal_entity_create(TEXT, TEXT, TEXT, UUID) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
