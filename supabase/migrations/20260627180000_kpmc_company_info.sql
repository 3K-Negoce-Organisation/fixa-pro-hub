-- Lot 7 (anticipé) — fiche société 3K-Négoce (miroir company_info_3k_revision MySQL)

CREATE TABLE IF NOT EXISTS kpmc.company_info_revisions (
  id BIGSERIAL PRIMARY KEY,
  version INTEGER NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  commentaire TEXT,
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_kpmc_company_info_revisions_version
  ON kpmc.company_info_revisions(version DESC);

ALTER TABLE kpmc.company_info_revisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage company_info" ON kpmc.company_info_revisions;
CREATE POLICY "KPMC admins manage company_info"
  ON kpmc.company_info_revisions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT ON kpmc.company_info_revisions TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.company_info_revisions_id_seq TO authenticated, service_role;

CREATE OR REPLACE FUNCTION kpmc.company_info_save_revision(p_payload JSONB, p_comment TEXT DEFAULT NULL)
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
  SELECT COALESCE(MAX(version), 0) + 1 INTO v_next FROM kpmc.company_info_revisions;
  INSERT INTO kpmc.company_info_revisions (version, user_id, commentaire, payload_json)
  VALUES (v_next, uid, NULLIF(TRIM(p_comment), ''), COALESCE(p_payload, '{}'::jsonb));
  RETURN v_next;
END;
$$;

GRANT EXECUTE ON FUNCTION kpmc.company_info_save_revision(JSONB, TEXT) TO authenticated, service_role;
