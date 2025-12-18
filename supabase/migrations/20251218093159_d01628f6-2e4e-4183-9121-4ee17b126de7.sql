-- Add new product fields from Excel structure
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS code_alsafix TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS designation_fr TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS box_quantity INTEGER;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS purchase_price_ht NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS box_weight NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS diameter_mm NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS length_mm NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS usage TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS material TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS drive_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS thickness_to_fix_mm NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS thread_length_mm NUMERIC;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS head_diameter_mm NUMERIC;