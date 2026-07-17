-- Frais de port configurables par site (supplier_settings.site_id)
ALTER TABLE public.supplier_settings
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10, 2) NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS default_shipping_fee numeric(10, 2) NOT NULL DEFAULT 12;

COMMENT ON COLUMN public.supplier_settings.free_shipping_threshold IS
  'Seuil TTC produits à partir duquel la livraison est offerte';
COMMENT ON COLUMN public.supplier_settings.default_shipping_fee IS
  'Frais de port TTC par défaut si le seuil n''est pas atteint';
