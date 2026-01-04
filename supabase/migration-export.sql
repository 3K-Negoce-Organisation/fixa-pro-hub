-- =====================================================
-- SCRIPT DE MIGRATION COMPLET - VIS-A-BOIS
-- Généré le 2026-01-04
-- =====================================================

-- =====================================================
-- 1. TYPES ENUM
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');

-- =====================================================
-- 2. TABLES
-- =====================================================

-- Table: products
CREATE TABLE public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    handle TEXT NOT NULL UNIQUE,
    price_ht NUMERIC NOT NULL,
    price_ttc NUMERIC NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    specifications JSONB DEFAULT '{}'::jsonb,
    tags TEXT[] DEFAULT '{}'::text[],
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    is_promo BOOLEAN DEFAULT false,
    promo_price_ht NUMERIC,
    promo_end_date TIMESTAMP WITH TIME ZONE,
    stock INTEGER DEFAULT 0,
    code_alsafix TEXT,
    designation_fr TEXT,
    box_quantity INTEGER,
    purchase_price_ht NUMERIC,
    box_weight NUMERIC,
    diameter_mm NUMERIC,
    length_mm NUMERIC,
    material TEXT,
    drive_type TEXT,
    usage TEXT,
    thickness_to_fix_mm NUMERIC,
    thread_length_mm NUMERIC,
    head_diameter_mm NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    company_name TEXT,
    siret TEXT,
    phone TEXT,
    billing_address TEXT,
    billing_city TEXT,
    billing_postal_code TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_postal_code TEXT,
    same_as_billing BOOLEAN DEFAULT true,
    marketing_consent BOOLEAN DEFAULT false,
    marketing_consent_date TIMESTAMP WITH TIME ZONE,
    newsletter_consent BOOLEAN DEFAULT false,
    newsletter_consent_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: user_roles
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Table: orders
CREATE TABLE public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    order_number TEXT NOT NULL UNIQUE,
    status public.order_status NOT NULL DEFAULT 'pending',
    total_ht NUMERIC NOT NULL,
    total_ttc NUMERIC NOT NULL,
    shipping_name TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_postal_code TEXT,
    tracking_number TEXT,
    carrier TEXT,
    notes TEXT,
    documents JSONB DEFAULT '[]'::jsonb,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    user_email TEXT,
    shopify_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: order_items
CREATE TABLE public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_title TEXT NOT NULL,
    product_image TEXT,
    variant_title TEXT,
    quantity INTEGER NOT NULL,
    unit_price_ht NUMERIC NOT NULL,
    unit_price_ttc NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: user_carts
CREATE TABLE public.user_carts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: supplier_settings
CREATE TABLE public.supplier_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    status_email TEXT,
    customer_number TEXT DEFAULT '000001',
    address TEXT,
    postal_code TEXT,
    city TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. FONCTIONS
-- =====================================================

-- Fonction: has_role (pour RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fonction: handle_updated_at (trigger)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fonction: handle_new_user (création profil auto)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- =====================================================
-- 4. TRIGGERS
-- =====================================================

-- Trigger: updated_at pour products
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: updated_at pour profiles
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: updated_at pour orders
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: updated_at pour user_carts
CREATE TRIGGER update_user_carts_updated_at
    BEFORE UPDATE ON public.user_carts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: updated_at pour supplier_settings
CREATE TRIGGER update_supplier_settings_updated_at
    BEFORE UPDATE ON public.supplier_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: création profil auto à l'inscription
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;

-- Policies: products
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies: user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Policies: orders
CREATE POLICY "Anyone can view orders by order_number" ON public.orders
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert orders" ON public.orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update orders" ON public.orders
    FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders" ON public.orders
    FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Policies: order_items
CREATE POLICY "Anyone can view order items for accessible orders" ON public.order_items
    FOR SELECT USING (true);

CREATE POLICY "Anyone can insert order items" ON public.order_items
    FOR INSERT WITH CHECK (true);

-- Policies: user_carts
CREATE POLICY "Users can view their own cart" ON public.user_carts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart" ON public.user_carts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart" ON public.user_carts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart" ON public.user_carts
    FOR DELETE USING (auth.uid() = user_id);

-- Policies: supplier_settings
CREATE POLICY "Admins can manage supplier settings" ON public.supplier_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =====================================================
-- 6. STORAGE BUCKETS
-- =====================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('order-documents', 'order-documents', false);

-- Storage policies: product-images (public)
CREATE POLICY "Product images are publicly accessible" ON storage.objects
    FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images" ON storage.objects
    FOR UPDATE USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images" ON storage.objects
    FOR DELETE USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));

-- Storage policies: order-documents (private)
CREATE POLICY "Admins can manage order documents" ON storage.objects
    FOR ALL USING (bucket_id = 'order-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their order documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'order-documents' 
        AND EXISTS (
            SELECT 1 FROM public.orders 
            WHERE orders.user_id = auth.uid() 
            AND (storage.foldername(name))[1] = orders.id::text
        )
    );

-- =====================================================
-- 7. DONNÉES - SUPPLIER SETTINGS
-- =====================================================

INSERT INTO public.supplier_settings (id, name, email, status_email, customer_number, address, postal_code, city, phone, created_at, updated_at)
VALUES (
    'f2d1642f-034c-495a-80df-f8a4624129ea',
    'Alsafix',
    'pierre@luceka.com',
    'pierre@luceka.com',
    '000001',
    'adresse adresse adresse',
    '67000',
    'HAGUENAU',
    '0388000000',
    '2025-12-19 07:47:53.431763+00',
    '2025-12-23 12:49:18.634583+00'
);

-- =====================================================
-- 8. SECRETS REQUIS (à configurer manuellement)
-- =====================================================
-- Les secrets suivants doivent être configurés dans le nouveau projet:
-- - STRIPE_SECRET_KEY
-- - STRIPE_WEBHOOK_SECRET
-- - RESEND_API_KEY
-- - N8N_WEBHOOK_URL
-- - ORDER_UPDATE_API_KEY

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================
