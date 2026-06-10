-- Snapshot catalogue au moment de la commande (descriptions, prix fournisseur, conditionnement, etc.)
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_description TEXT,
  ADD COLUMN IF NOT EXISTS designation_fr TEXT,
  ADD COLUMN IF NOT EXISTS product_handle TEXT,
  ADD COLUMN IF NOT EXISTS variant_id TEXT,
  ADD COLUMN IF NOT EXISTS code_alsafix TEXT,
  ADD COLUMN IF NOT EXISTS box_quantity INTEGER,
  ADD COLUMN IF NOT EXISTS snapshot_purchase_price_ht DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS snapshot_unite_de_vente DECIMAL(10, 4);

COMMENT ON COLUMN public.order_items.product_description IS 'Description produit figée à la commande';
COMMENT ON COLUMN public.order_items.designation_fr IS 'Désignation FR figée à la commande';
COMMENT ON COLUMN public.order_items.snapshot_purchase_price_ht IS 'Prix d''achat HT figé à la commande (PDF fournisseur)';
COMMENT ON COLUMN public.order_items.snapshot_unite_de_vente IS 'Unité de vente Alsafix figée à la commande';

-- Backfill best-effort pour les commandes existantes (état catalogue actuel)
UPDATE public.order_items oi
SET
  product_description = COALESCE(oi.product_description, p.description),
  designation_fr = COALESCE(oi.designation_fr, p.designation_fr),
  product_handle = COALESCE(oi.product_handle, p.handle),
  variant_id = COALESCE(oi.variant_id, oi.product_id),
  code_alsafix = COALESCE(oi.code_alsafix, p.code_alsafix),
  box_quantity = COALESCE(oi.box_quantity, p.box_quantity),
  snapshot_purchase_price_ht = COALESCE(oi.snapshot_purchase_price_ht, p.purchase_price_ht),
  snapshot_unite_de_vente = COALESCE(oi.snapshot_unite_de_vente, p.unite_de_vente)
FROM public.products p
WHERE oi.product_id = p.id::text;
