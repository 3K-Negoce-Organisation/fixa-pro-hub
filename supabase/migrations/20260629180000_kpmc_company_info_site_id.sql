-- Fiche société KPMC : une série de versions par site vitrine (public.sites)

ALTER TABLE kpmc.company_info_revisions
  ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE;

UPDATE kpmc.company_info_revisions r
SET site_id = s.id
FROM public.sites s
WHERE r.site_id IS NULL AND s.slug = 'vis-a-bois';

UPDATE kpmc.company_info_revisions r
SET site_id = (SELECT id FROM public.sites ORDER BY created_at ASC LIMIT 1)
WHERE r.site_id IS NULL;

ALTER TABLE kpmc.company_info_revisions
  ALTER COLUMN site_id SET NOT NULL;

ALTER TABLE kpmc.company_info_revisions
  DROP CONSTRAINT IF EXISTS company_info_revisions_version_key;

DROP INDEX IF EXISTS kpmc.uk_kpmc_company_info_site_version;
CREATE UNIQUE INDEX uk_kpmc_company_info_site_version
  ON kpmc.company_info_revisions(site_id, version);

CREATE INDEX IF NOT EXISTS idx_kpmc_company_info_revisions_site
  ON kpmc.company_info_revisions(site_id, version DESC);

CREATE OR REPLACE FUNCTION kpmc.company_info_save_revision(
  p_site_id UUID,
  p_payload JSONB,
  p_comment TEXT DEFAULT NULL
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
  IF p_site_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.sites WHERE id = p_site_id) THEN
    RAISE EXCEPTION 'Site inconnu';
  END IF;
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next
  FROM kpmc.company_info_revisions
  WHERE site_id = p_site_id;
  INSERT INTO kpmc.company_info_revisions (site_id, version, user_id, commentaire, payload_json)
  VALUES (p_site_id, v_next, uid, NULLIF(TRIM(p_comment), ''), COALESCE(p_payload, '{}'::jsonb));
  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION kpmc.company_info_save_revision(UUID, JSONB, TEXT) TO authenticated, service_role;

DROP FUNCTION IF EXISTS kpmc.company_info_save_revision(JSONB, TEXT);

NOTIFY pgrst, 'reload schema';
