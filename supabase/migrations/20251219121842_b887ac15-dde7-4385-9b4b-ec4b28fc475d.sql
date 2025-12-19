-- Add promo fields to products table
ALTER TABLE public.products 
ADD COLUMN is_promo boolean DEFAULT false,
ADD COLUMN promo_price_ht numeric DEFAULT NULL;

-- Create index for faster promo filtering
CREATE INDEX idx_products_is_promo ON public.products(is_promo) WHERE is_promo = true;