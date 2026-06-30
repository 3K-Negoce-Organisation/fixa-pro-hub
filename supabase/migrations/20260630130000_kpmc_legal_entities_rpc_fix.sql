-- Correctif : recréer la RPC company_info_save_revision avec p_legal_entity_id
-- (CREATE OR REPLACE ne peut pas renommer un paramètre PostgreSQL)

DROP FUNCTION IF EXISTS kpmc.company_info_save_revision(JSONB, TEXT, UUID);

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
