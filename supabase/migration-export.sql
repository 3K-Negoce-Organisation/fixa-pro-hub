-- ============================================================================
-- VIS-A-BOIS - COMPLETE SCHEMA EXPORT
-- ============================================================================
-- This file contains the complete database schema for migration to external
-- Supabase projects (Staging/Production).
--
-- Usage:
--   1. Create a new Supabase project
--   2. Run this script in the SQL Editor
--   3. Deploy Edge Functions with Supabase CLI
--   4. Configure secrets in Dashboard > Settings > Edge Functions
--   5. Create admin user manually
--
-- Generated: 2025-01-19
-- Source: Lovable Cloud Project (dvifxaygfrhhzmnmyiyp)
-- ============================================================================

-- ============================================================================
-- SECTION 1: CUSTOM TYPES (ENUMS)
-- ============================================================================

-- Application roles enum
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Order status enum
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM (
        'pending',
        'paid',
        'confirmed',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- SECTION 2: TABLES
-- ============================================================================

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    handle TEXT NOT NULL UNIQUE,
    price_ht NUMERIC NOT NULL,
    price_ttc NUMERIC NOT NULL,
    images JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    tags TEXT[] DEFAULT '{}'::text[],
    category TEXT,
    specifications JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    -- Technical specifications
    code_alsafix TEXT UNIQUE,
    designation_fr TEXT,
    box_quantity INTEGER,
    purchase_price_ht NUMERIC,
    box_weight NUMERIC,
    diameter_mm NUMERIC,
    length_mm NUMERIC,
    usage TEXT,
    material TEXT,
    drive_type TEXT,
    thickness_to_fix_mm NUMERIC,
    thread_length_mm NUMERIC,
    head_diameter_mm NUMERIC,
    -- Promo fields
    is_promo BOOLEAN DEFAULT false,
    promo_price_ht NUMERIC,
    promo_end_date TIMESTAMP WITH TIME ZONE
);

-- Profiles table (user additional information)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    first_name TEXT,
    last_name TEXT,
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

-- User roles table (for access control)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role public.app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
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

-- Order items table
CREATE TABLE IF NOT EXISTS public.order_items (
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

-- User carts table
CREATE TABLE IF NOT EXISTS public.user_carts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Supplier settings table
CREATE TABLE IF NOT EXISTS public.supplier_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    status_email TEXT,
    address TEXT,
    postal_code TEXT,
    city TEXT,
    phone TEXT,
    customer_number TEXT DEFAULT '000001',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Site themes table (for theming)
CREATE TABLE IF NOT EXISTS public.site_themes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    colors JSONB DEFAULT '{}'::jsonb,
    fonts JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- SECTION 3: FUNCTIONS
-- ============================================================================

-- Function to check if a user has a specific role (SECURITY DEFINER to avoid RLS recursion)
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

-- Function to update the updated_at timestamp automatically
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

-- Function to create a profile for new users automatically
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

-- ============================================================================
-- SECTION 4: TRIGGERS
-- ============================================================================

-- Drop existing triggers if they exist (for clean migration)
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_user_carts_updated_at ON public.user_carts;
DROP TRIGGER IF EXISTS update_supplier_settings_updated_at ON public.supplier_settings;
DROP TRIGGER IF EXISTS supplier_settings_updated_at ON public.supplier_settings;
DROP TRIGGER IF EXISTS update_site_themes_updated_at ON public.site_themes;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create updated_at triggers for all tables
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_carts_updated_at
    BEFORE UPDATE ON public.user_carts
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_supplier_settings_updated_at
    BEFORE UPDATE ON public.supplier_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_site_themes_updated_at
    BEFORE UPDATE ON public.site_themes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to create profile for new users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------
-- PRODUCTS POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Anyone can view active products"
    ON public.products
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------
-- PROFILES POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- USER ROLES POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles"
    ON public.user_roles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
    ON public.user_roles
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------
-- ORDERS POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

CREATE POLICY "Users can view their own orders"
    ON public.orders
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert orders"
    ON public.orders
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admins can update orders"
    ON public.orders
    FOR UPDATE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
    ON public.orders
    FOR DELETE
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------
-- ORDER ITEMS POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Anyone can view order items for accessible orders" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;

CREATE POLICY "Anyone can view order items for accessible orders"
    ON public.order_items
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can insert order items"
    ON public.order_items
    FOR INSERT
    WITH CHECK (true);

-- ----------------------------------------
-- USER CARTS POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can insert their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can update their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can delete their own cart" ON public.user_carts;

CREATE POLICY "Users can view their own cart"
    ON public.user_carts
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cart"
    ON public.user_carts
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cart"
    ON public.user_carts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cart"
    ON public.user_carts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ----------------------------------------
-- SUPPLIER SETTINGS POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Admins can manage supplier settings" ON public.supplier_settings;

CREATE POLICY "Admins can manage supplier settings"
    ON public.supplier_settings
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ----------------------------------------
-- SITE THEMES POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Anyone can view active themes" ON public.site_themes;
DROP POLICY IF EXISTS "Admins can manage themes" ON public.site_themes;

CREATE POLICY "Anyone can view active themes"
    ON public.site_themes
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can manage themes"
    ON public.site_themes
    FOR ALL
    TO authenticated
    USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- SECTION 6: STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('order-documents', 'order-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================================
-- SECTION 7: STORAGE POLICIES
-- ============================================================================

-- ----------------------------------------
-- PRODUCT-IMAGES BUCKET POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Anyone can view product images" ON storage.objects;
DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;

CREATE POLICY "Anyone can view product images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'product-images' 
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can update product images"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'product-images' 
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Admins can delete product images"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'product-images' 
        AND public.has_role(auth.uid(), 'admin')
    );

-- ----------------------------------------
-- ORDER-DOCUMENTS BUCKET POLICIES
-- ----------------------------------------
DROP POLICY IF EXISTS "Users can view their own order documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their order documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload order documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all order documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage order documents" ON storage.objects;
DROP POLICY IF EXISTS "Service role can update order documents" ON storage.objects;

CREATE POLICY "Users can view their own order documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'order-documents'
        AND EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.user_id = auth.uid()
            AND objects.name ~~ (orders.order_number || '/%')
        )
    );

CREATE POLICY "Admins can view all order documents"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'order-documents'
        AND public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Service role can upload order documents"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'order-documents');

CREATE POLICY "Service role can update order documents"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'order-documents');

-- ============================================================================
-- SECTION 8: INDEXES (for performance)
-- ============================================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_handle ON public.products(handle);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_promo ON public.products(is_promo);
CREATE INDEX IF NOT EXISTS idx_products_code_alsafix ON public.products(code_alsafix);

-- Orders indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- User roles indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- ============================================================================
-- SECTION 9: INITIAL DATA
-- ============================================================================

-- Insert default supplier settings (Alsafix)
INSERT INTO public.supplier_settings (name, email, customer_number)
VALUES ('Alsafix', 'commandes@alsafix.fr', '000001')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SECTION 10: REQUIRED SECRETS FOR EDGE FUNCTIONS
-- ============================================================================
/*
Configure these secrets in Supabase Dashboard > Settings > Edge Functions:

Required secrets:
- STRIPE_SECRET_KEY        : Stripe secret key (sk_live_... or sk_test_...)
- STRIPE_WEBHOOK_SECRET    : Stripe webhook signing secret (whsec_...)
- N8N_WEBHOOK_URL          : n8n webhook URL for order fulfillment
- RESEND_API_KEY           : Resend API key for transactional emails
- ORDER_UPDATE_API_KEY     : API key for external order status updates

Auto-configured by Supabase:
- SUPABASE_URL             : Project URL (auto)
- SUPABASE_ANON_KEY        : Anon key (auto)
- SUPABASE_SERVICE_ROLE_KEY: Service role key (auto)
*/

-- ============================================================================
-- SECTION 11: POST-MIGRATION INSTRUCTIONS
-- ============================================================================
/*
After running this script:

1. DEPLOY EDGE FUNCTIONS
   cd your-project
   supabase link --project-ref YOUR_PROJECT_ID
   supabase functions deploy --no-verify-jwt

2. CONFIGURE STRIPE WEBHOOK
   - Go to Stripe Dashboard > Webhooks
   - Add endpoint: https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook
   - Select events: payment_intent.succeeded, checkout.session.completed
   - Copy signing secret to Edge Function secrets as STRIPE_WEBHOOK_SECRET

3. CREATE ADMIN USER
   - Go to Supabase Dashboard > Authentication > Users
   - Create user with "Auto Confirm User" checked
   - Then in SQL Editor:
     INSERT INTO public.user_roles (user_id, role)
     VALUES ('USER_UUID_HERE', 'admin');

4. CONFIGURE EMAIL (Optional)
   - Add DNS records for Resend:
     MX: feedback-smtp.eu-west-1.amazonses.com
     SPF: v=spf1 include:amazonses.com ~all

5. IMPORT DATA (Optional)
   - Use supabase/data-export.sql for products and orders data

6. TEST THE SETUP
   - Create a test order
   - Verify webhook triggers
   - Check order appears in admin panel
*/

-- ============================================================================
-- END OF MIGRATION SCRIPT
-- ============================================================================
