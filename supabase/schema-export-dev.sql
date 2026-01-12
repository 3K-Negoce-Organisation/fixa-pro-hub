-- ================================================
-- EXPORT SCHEMA VIS-ALSAFIX - DEV IMPORT
-- Généré le: 2026-01-06
-- Exclut: user_roles, orders, order_items (données sensibles)
-- ================================================

-- ================================================
-- 1. TYPES PERSONNALISÉS
-- ================================================

-- Créer les types si ils n'existent pas
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ================================================
-- 2. DROP TABLES (sauf users/roles/orders)
-- ================================================

DROP TABLE IF EXISTS public.user_carts CASCADE;
DROP TABLE IF EXISTS public.supplier_settings CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ================================================
-- 3. TABLES
-- ================================================

-- Table: profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    company_name text,
    siret text,
    phone text,
    billing_address text,
    billing_city text,
    billing_postal_code text,
    shipping_address text,
    shipping_city text,
    shipping_postal_code text,
    same_as_billing boolean DEFAULT true,
    marketing_consent boolean DEFAULT false,
    marketing_consent_date timestamp with time zone,
    newsletter_consent boolean DEFAULT false,
    newsletter_consent_date timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    handle text NOT NULL UNIQUE,
    price_ht numeric NOT NULL,
    price_ttc numeric NOT NULL,
    images jsonb DEFAULT '[]'::jsonb,
    variants jsonb DEFAULT '[]'::jsonb,
    tags text[] DEFAULT '{}'::text[],
    category text,
    specifications jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    stock integer DEFAULT 0,
    -- Champs techniques Alsafix
    code_alsafix text UNIQUE,
    designation_fr text,
    box_quantity integer,
    purchase_price_ht numeric,
    box_weight numeric,
    diameter_mm numeric,
    length_mm numeric,
    usage text,
    material text,
    drive_type text,
    thickness_to_fix_mm numeric,
    thread_length_mm numeric,
    head_diameter_mm numeric,
    -- Champs promo
    is_promo boolean DEFAULT false,
    promo_price_ht numeric,
    promo_end_date timestamp with time zone,
    -- Timestamps
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Table: user_carts
CREATE TABLE IF NOT EXISTS public.user_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Table: supplier_settings
CREATE TABLE IF NOT EXISTS public.supplier_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    status_email text,
    address text,
    postal_code text,
    city text,
    phone text,
    customer_number text DEFAULT '000001',
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ================================================
-- 4. FONCTIONS
-- ================================================

-- Fonction: has_role (vérification des rôles)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Fonction: handle_updated_at (trigger auto-update)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fonction: handle_new_user (création auto profil)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- ================================================
-- 5. TRIGGERS
-- ================================================

-- Triggers updated_at
DROP TRIGGER IF EXISTS handle_updated_at ON public.products;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.profiles;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.user_carts;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.user_carts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON public.supplier_settings;
CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.supplier_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger création profil auto (sur auth.users)
-- Note: À exécuter manuellement car touche au schema auth
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;

-- Policies: profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies: products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Anyone can view active products" ON public.products
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies: user_carts
DROP POLICY IF EXISTS "Users can view their own cart" ON public.user_carts;
CREATE POLICY "Users can view their own cart" ON public.user_carts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own cart" ON public.user_carts;
CREATE POLICY "Users can insert their own cart" ON public.user_carts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON public.user_carts;
CREATE POLICY "Users can update their own cart" ON public.user_carts
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cart" ON public.user_carts;
CREATE POLICY "Users can delete their own cart" ON public.user_carts
    FOR DELETE USING (auth.uid() = user_id);

-- Policies: supplier_settings
DROP POLICY IF EXISTS "Admins can manage supplier settings" ON public.supplier_settings;
CREATE POLICY "Admins can manage supplier settings" ON public.supplier_settings
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- ================================================
-- 7. STORAGE BUCKETS
-- ================================================

-- Note: Exécuter dans le dashboard Supabase ou via API
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES ('order-documents', 'order-documents', false)
-- ON CONFLICT (id) DO NOTHING;

-- ================================================
-- 8. DONNÉES INITIALES
-- ================================================

-- Supplier settings par défaut
INSERT INTO public.supplier_settings (name, email, customer_number)
VALUES ('Alsafix', 'contact@alsafix.fr', '000001')
ON CONFLICT DO NOTHING;

-- ================================================
-- 9. TABLES EXCLUES (référence uniquement)
-- ================================================

/*
Tables NON incluses dans cet export (à créer manuellement si nécessaire):

-- user_roles (sensible - rôles admin)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- orders (données commandes)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    order_number text NOT NULL UNIQUE,
    status order_status NOT NULL DEFAULT 'pending',
    total_ht numeric NOT NULL,
    total_ttc numeric NOT NULL,
    shipping_name text,
    shipping_address text,
    shipping_city text,
    shipping_postal_code text,
    tracking_number text,
    carrier text,
    notes text,
    documents jsonb DEFAULT '[]'::jsonb,
    is_archived boolean DEFAULT false,
    user_email text,
    shopify_order_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- order_items (lignes commandes)
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id text NOT NULL,
    product_title text NOT NULL,
    product_image text,
    variant_title text,
    quantity integer NOT NULL,
    unit_price_ht numeric NOT NULL,
    unit_price_ttc numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);
*/

-- ================================================
-- FIN DE L'EXPORT
-- ================================================
