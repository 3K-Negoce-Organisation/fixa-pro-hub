-- KPMC — suivi imports MySQL → Supabase

CREATE TABLE IF NOT EXISTS kpmc.data_import_runs (
  id BIGSERIAL PRIMARY KEY,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'failed')),
  dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  modules TEXT[] NOT NULL DEFAULT '{}',
  summary_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  source_host TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS kpmc.legacy_id_map (
  entity_type TEXT NOT NULL,
  legacy_id BIGINT NOT NULL,
  new_id BIGINT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, legacy_id)
);

CREATE INDEX IF NOT EXISTS idx_kpmc_legacy_id_map_new ON kpmc.legacy_id_map(entity_type, new_id);

ALTER TABLE kpmc.data_import_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.legacy_id_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage data_import_runs" ON kpmc.data_import_runs;
CREATE POLICY "KPMC admins manage data_import_runs"
  ON kpmc.data_import_runs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage legacy_id_map" ON kpmc.legacy_id_map;
CREATE POLICY "KPMC admins manage legacy_id_map"
  ON kpmc.legacy_id_map FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.data_import_runs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.legacy_id_map TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.data_import_runs_id_seq TO authenticated, service_role;
