-- Add shipping name field to orders table
ALTER TABLE public.orders
ADD COLUMN shipping_name text;