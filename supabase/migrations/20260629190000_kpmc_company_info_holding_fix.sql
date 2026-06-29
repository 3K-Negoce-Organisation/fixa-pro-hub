-- Correctif si la première version de 20260629180000 avait déjà été appliquée :
-- site_id redevient nullable ; holding 3K-Négoce conservé sans site_id.

ALTER TABLE kpmc.company_info_revisions
  ALTER COLUMN site_id DROP NOT NULL;

-- Si toutes les révisions pointent vers le même site (artefact de migration), rétablir le holding.
UPDATE kpmc.company_info_revisions
SET site_id = NULL
WHERE site_id IS NOT NULL
  AND (SELECT COUNT(DISTINCT site_id) FROM kpmc.company_info_revisions) = 1;

DROP INDEX IF EXISTS kpmc.uk_kpmc_company_info_holding_version;
CREATE UNIQUE INDEX uk_kpmc_company_info_holding_version
  ON kpmc.company_info_revisions(version)
  WHERE site_id IS NULL;

DROP INDEX IF EXISTS kpmc.uk_kpmc_company_info_site_version;
CREATE UNIQUE INDEX uk_kpmc_company_info_site_version
  ON kpmc.company_info_revisions(site_id, version)
  WHERE site_id IS NOT NULL;

CREATE OR REPLACE FUNCTION kpmc.company_info_save_revision(
  p_payload JSONB,
  p_comment TEXT DEFAULT NULL,
  p_site_id UUID DEFAULT NULL
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

  IF p_site_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sites WHERE id = p_site_id) THEN
    RAISE EXCEPTION 'Site inconnu';
  END IF;

  IF p_site_id IS NULL THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
    FROM kpmc.company_info_revisions
    WHERE site_id IS NULL;
    INSERT INTO kpmc.company_info_revisions (site_id, version, user_id, commentaire, payload_json)
    VALUES (NULL, v_next, uid, NULLIF(TRIM(p_comment), ''), COALESCE(p_payload, '{}'::jsonb));
  ELSE
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
    FROM kpmc.company_info_revisions
    WHERE site_id = p_site_id;
    INSERT INTO kpmc.company_info_revisions (site_id, version, user_id, commentaire, payload_json)
    VALUES (p_site_id, v_next, uid, NULLIF(TRIM(p_comment), ''), COALESCE(p_payload, '{}'::jsonb));
  END IF;

  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION kpmc.company_info_save_revision(JSONB, TEXT, UUID) TO authenticated, service_role;

DROP FUNCTION IF EXISTS kpmc.company_info_save_revision(UUID, JSONB, TEXT);

NOTIFY pgrst, 'reload schema';
