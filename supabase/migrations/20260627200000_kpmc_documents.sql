-- Lot 4 — GED KPMC (miroir document_folders + documents MySQL)

CREATE TABLE IF NOT EXISTS kpmc.document_folders (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  parent_id BIGINT REFERENCES kpmc.document_folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_document_folders_parent ON kpmc.document_folders(parent_id);

CREATE TABLE IF NOT EXISTS kpmc.document_categories (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 10
);

INSERT INTO kpmc.document_categories (code, label, ordre)
SELECT v.code, v.label, v.ordre
FROM (VALUES
  ('avance_associe', 'Avance associé', 1),
  ('commande_client', 'Commande client', 2),
  ('facture_fournisseur', 'Facture fournisseur', 3),
  ('frais_bancaire', 'Frais bancaire', 4),
  ('charge_recurrente', 'Charge récurrente', 5),
  ('impots_taxes', 'Impôts et taxes', 6),
  ('autre', 'Autre', 99)
) AS v(code, label, ordre)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.document_categories LIMIT 1);

CREATE TABLE IF NOT EXISTS kpmc.documents (
  id BIGSERIAL PRIMARY KEY,
  folder_id BIGINT NOT NULL REFERENCES kpmc.document_folders(id) ON DELETE CASCADE,
  original_name TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  file_size BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  commentaire TEXT,
  categorie TEXT REFERENCES kpmc.document_categories(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpmc_documents_folder ON kpmc.documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_kpmc_documents_created ON kpmc.documents(created_at DESC);

ALTER TABLE kpmc.document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpmc.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "KPMC admins manage document_folders" ON kpmc.document_folders;
CREATE POLICY "KPMC admins manage document_folders"
  ON kpmc.document_folders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins read document_categories" ON kpmc.document_categories;
CREATE POLICY "KPMC admins read document_categories"
  ON kpmc.document_categories FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "KPMC admins manage documents" ON kpmc.documents;
CREATE POLICY "KPMC admins manage documents"
  ON kpmc.documents FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.document_folders TO authenticated, service_role;
GRANT SELECT ON kpmc.document_categories TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON kpmc.documents TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.document_folders_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.document_categories_id_seq TO authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE kpmc.documents_id_seq TO authenticated, service_role;

INSERT INTO kpmc.document_folders (label, sort_order, parent_id)
SELECT v.label, v.sort_order, NULL::bigint
FROM (VALUES
  ('Administratif', 1),
  ('Comptabilité', 2),
  ('Réunions', 3),
  ('Divers', 4)
) AS v(label, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM kpmc.document_folders LIMIT 1);

-- Bucket Storage dédié KPMC (privé, admins uniquement)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kpmc-documents', 'kpmc-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "KPMC admins read kpmc-documents" ON storage.objects;
CREATE POLICY "KPMC admins read kpmc-documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kpmc-documents'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "KPMC admins upload kpmc-documents" ON storage.objects;
CREATE POLICY "KPMC admins upload kpmc-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'kpmc-documents'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "KPMC admins update kpmc-documents" ON storage.objects;
CREATE POLICY "KPMC admins update kpmc-documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'kpmc-documents'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "KPMC admins delete kpmc-documents" ON storage.objects;
CREATE POLICY "KPMC admins delete kpmc-documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'kpmc-documents'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );
