-- Add shopify_order_id column to orders table for Shopify synchronization
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shopify_order_id text;