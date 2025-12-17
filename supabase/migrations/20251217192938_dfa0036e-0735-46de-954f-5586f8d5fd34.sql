-- Create products table for catalog management
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  handle TEXT UNIQUE NOT NULL,
  price_ht NUMERIC NOT NULL,
  price_ttc NUMERIC NOT NULL,
  images JSONB DEFAULT '[]',
  variants JSONB DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  category TEXT,
  specifications JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public read access for all products
CREATE POLICY "Anyone can view active products"
ON public.products
FOR SELECT
USING (is_active = true);

-- Admin can manage all products
CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();