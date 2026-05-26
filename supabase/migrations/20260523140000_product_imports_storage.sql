-- Archive du dernier fichier Excel d'import produits (admin)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-imports', 'product-imports', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admins read product imports" ON storage.objects;
CREATE POLICY "Admins read product imports"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-imports' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins upload product imports" ON storage.objects;
CREATE POLICY "Admins upload product imports"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-imports' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins update product imports" ON storage.objects;
CREATE POLICY "Admins update product imports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'product-imports' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins delete product imports" ON storage.objects;
CREATE POLICY "Admins delete product imports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-imports' AND has_role(auth.uid(), 'admin'::app_role));
