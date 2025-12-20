-- Add customer number field to supplier_settings
ALTER TABLE public.supplier_settings
ADD COLUMN customer_number text DEFAULT '000001';