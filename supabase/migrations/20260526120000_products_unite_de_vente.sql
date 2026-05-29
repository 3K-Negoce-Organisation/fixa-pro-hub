-- Unité de vente Alsafix pour le Tarif UV (bon de commande fournisseur).
-- tarif_uv = (purchase_price_ht / box_quantity) * unite_de_vente

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unite_de_vente integer NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.products.unite_de_vente IS
  'Unité de vente Alsafix : tarif UV = (purchase_price_ht / box_quantity) * unite_de_vente';

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_unite_de_vente_positive;

ALTER TABLE public.products
  ADD CONSTRAINT products_unite_de_vente_positive CHECK (unite_de_vente > 0);

-- Kits et accessoires : tarif UV par unité (×1), comme avant la règle code TOOL/KIT
UPDATE public.products
SET unite_de_vente = 1
WHERE code_alsafix IS NOT NULL
  AND (
    upper(trim(code_alsafix)) LIKE 'KIT%'
    OR upper(trim(code_alsafix)) LIKE 'TOOL%'
  );

-- Kits : une boîte = un kit (évite une division erronée sur box_quantity)
UPDATE public.products
SET box_quantity = 1
WHERE code_alsafix IS NOT NULL
  AND upper(trim(code_alsafix)) LIKE 'KIT%'
  AND (box_quantity IS NULL OR box_quantity <> 1);
