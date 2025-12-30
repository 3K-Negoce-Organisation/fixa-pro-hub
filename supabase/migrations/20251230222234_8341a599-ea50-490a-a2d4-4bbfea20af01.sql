-- Add promo end date field to products table
ALTER TABLE public.products 
ADD COLUMN promo_end_date timestamp with time zone DEFAULT NULL;