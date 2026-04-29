-- Promo v2: support % discount and fixed gift products (can be combined)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo_discount_percent numeric,
  ADD COLUMN IF NOT EXISTS promo_gift_product_id uuid,
  ADD COLUMN IF NOT EXISTS promo_gift_quantity integer,
  ADD COLUMN IF NOT EXISTS promo_label text;

ALTER TABLE public.products
  ALTER COLUMN promo_gift_quantity SET DEFAULT 1;

UPDATE public.products
SET promo_gift_quantity = 1
WHERE promo_gift_quantity IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_promo_discount_percent_range_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_promo_discount_percent_range_check
      CHECK (
        promo_discount_percent IS NULL
        OR (promo_discount_percent >= 0 AND promo_discount_percent <= 100)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_promo_gift_quantity_positive_check'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_promo_gift_quantity_positive_check
      CHECK (promo_gift_quantity IS NULL OR promo_gift_quantity >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'products_promo_gift_product_fkey'
      AND conrelid = 'public.products'::regclass
  ) THEN
    ALTER TABLE public.products
      ADD CONSTRAINT products_promo_gift_product_fkey
      FOREIGN KEY (promo_gift_product_id)
      REFERENCES public.products(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_products_promo_gift_product_id
  ON public.products(promo_gift_product_id)
  WHERE promo_gift_product_id IS NOT NULL;

COMMENT ON COLUMN public.products.promo_discount_percent IS 'Discount percentage (0-100).';
COMMENT ON COLUMN public.products.promo_gift_product_id IS 'Optional fixed gift product for this promo.';
COMMENT ON COLUMN public.products.promo_gift_quantity IS 'Gift quantity when promo_gift_product_id is set.';
COMMENT ON COLUMN public.products.promo_label IS 'Optional marketing promo label displayed in storefront/admin.';
