-- =====================================================
-- Migration: Table categories + products.category_id
-- Idempotente : safe à appliquer même si déjà présent
-- =====================================================

-- 1. Créer la table categories (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id     UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  name        VARCHAR NOT NULL,
  slug        VARCHAR NOT NULL,
  description TEXT,
  image_url   TEXT,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contrainte d'unicité slug par site
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'categories_site_id_slug_key'
      AND conrelid = 'public.categories'::regclass
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_site_id_slug_key UNIQUE (site_id, slug);
  END IF;
END $$;

-- Trigger updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_categories_updated_at'
      AND tgrelid = 'public.categories'::regclass
  ) THEN
    CREATE TRIGGER update_categories_updated_at
      BEFORE UPDATE ON public.categories
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 2. RLS sur categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories'
      AND policyname = 'Anyone can read active categories'
  ) THEN
    CREATE POLICY "Anyone can read active categories" ON public.categories
      FOR SELECT USING (is_active = true OR is_active IS NULL);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories'
      AND policyname = 'Admins can manage categories'
  ) THEN
    CREATE POLICY "Admins can manage categories" ON public.categories
      FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Permissions anon / authenticated
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.categories TO service_role;

-- 3. Ajouter category_id sur products (IF NOT EXISTS)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- 4. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_categories_site_id    ON public.categories(site_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug       ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_is_active  ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_products_category_id  ON public.products(category_id);
