-- Lot 6 — Calendrier KPMC (miroir events + event_families MySQL)

CREATE TABLE IF NOT EXISTS kpmc.event_families (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order SMALLINT NOT NULL DEFAULT 0
);

INSERT INTO kpmc.event_families (label, sort_order)
SELECT v.label, v.sort_order
FROM (VALUES ('Événement principal', 1::smallint), ('Autres', 2::smallint)) AS v(label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.event_families LIMIT 1);

CREATE TABLE IF NOT EXISTS kpmc.events (
  id BIGSERIAL PRIMARY KEY,
  event_date DATE NOT NULL,
  event_date_end DATE,
  event_time_start TIME,
  event_time_end TIME,
  title TEXT NOT NULL CHECK (char_length(title) <= 30),
  description TEXT,
  event_location TEXT,
  type TEXT NOT NULL DEFAULT 'autre'
    CHECK (type IN ('ag', 'reunion', 'permanence', 'autre')),
  family_id BIGINT REFERENCES kpmc.event_families(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT kpmc_events_date_end_ok CHECK (
    event_date_end IS NULL OR event_date_end >= event_date
  )
);

CREATE INDEX IF NOT EXISTS idx_kpmc_events_event_date ON kpmc.events(event_date);
CREATE INDEX IF NOT EXISTS idx_kpmc_events_date_range ON kpmc.events(event_date, event_date_end);

ALTER TABLE kpmc.event_families ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage event_families" ON kpmc.event_families;
CREATE POLICY "KPMC admins manage event_families"
  ON kpmc.event_families FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage events" ON kpmc.events;
CREATE POLICY "KPMC admins manage events"
  ON kpmc.events FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.event_families TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.events TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.event_families_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.events_id_seq TO authenticated, service_role;
