-- Architecture éditoriale blog Vis-à-Bois (plan com 3K-Négoce juillet 2026)
-- Catégories extensibles + champs audience / visuels / SEO / CTA

CREATE TABLE IF NOT EXISTS public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_categories_site_slug_unique UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS blog_categories_site_active_idx
  ON public.blog_categories (site_id, is_active, sort_order);

DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER update_blog_categories_updated_at
  BEFORE UPDATE ON public.blog_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active blog categories" ON public.blog_categories;
CREATE POLICY "Anyone can read active blog categories"
  ON public.blog_categories
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage blog categories" ON public.blog_categories;
CREATE POLICY "Admins can manage blog categories"
  ON public.blog_categories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO authenticated;

-- Catégories formats (actives) + extensions prévues (inactives, activables plus tard)
INSERT INTO public.blog_categories (site_id, slug, name, description, sort_order, is_active)
SELECT s.id, v.slug, v.name, v.description, v.sort_order, v.is_active
FROM public.sites s
CROSS JOIN (
  VALUES
    ('astuce-du-jour', 'Astuce du jour', 'Astuces simples et inspiration (cible particuliers / pros).', 0, true),
    ('avant-apres', 'Avant / Après', 'Transformations chantier et démonstrations avant/après.', 1, true),
    ('conseil-du-pro', 'Conseil du pro', 'Conseils techniques pour les professionnels.', 2, true),
    ('cas-clients', 'Cas clients', 'Retours d''expérience clients (activation ultérieure).', 3, false),
    ('faq', 'FAQ', 'Réponses aux questions fréquentes (activation ultérieure).', 4, false),
    ('actualites-secteur', 'Actualités du secteur', 'Veille et actualités (activation ultérieure).', 5, false)
) AS v(slug, name, description, sort_order, is_active)
WHERE s.slug = 'vis-a-bois'
ON CONFLICT (site_id, slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active;

-- Enrichissement articles
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'particulier',
  ADD COLUMN IF NOT EXISTS cover_image_pinterest_url text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS cta_type text NOT NULL DEFAULT 'catalogue',
  ADD COLUMN IF NOT EXISTS cta_label text,
  ADD COLUMN IF NOT EXISTS cta_url text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_audience_check'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_audience_check
      CHECK (audience IN ('professionnel', 'particulier'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'blog_posts_cta_type_check'
  ) THEN
    ALTER TABLE public.blog_posts
      ADD CONSTRAINT blog_posts_cta_type_check
      CHECK (cta_type IN ('catalogue', 'devis', 'avis', 'custom'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS blog_posts_category_idx ON public.blog_posts (category_id);
CREATE INDEX IF NOT EXISTS blog_posts_audience_idx ON public.blog_posts (site_id, audience);

-- Relier les articles seed aux formats + audience
UPDATE public.blog_posts p
SET
  category_id = c.id,
  audience = CASE p.slug
    WHEN 'choisir-vis-terrasse' THEN 'particulier'
    WHEN 'tirefond-ou-vis-charpente' THEN 'professionnel'
    WHEN 'guide-empreintes-torx' THEN 'professionnel'
    ELSE p.audience
  END,
  cta_type = CASE p.slug
    WHEN 'choisir-vis-terrasse' THEN 'catalogue'
    WHEN 'tirefond-ou-vis-charpente' THEN 'devis'
    ELSE 'catalogue'
  END,
  meta_description = COALESCE(p.meta_description, p.excerpt)
FROM public.blog_categories c
JOIN public.sites s ON s.id = c.site_id
WHERE p.site_id = s.id
  AND s.slug = 'vis-a-bois'
  AND (
    (p.slug = 'choisir-vis-terrasse' AND c.slug = 'astuce-du-jour')
    OR (p.slug = 'tirefond-ou-vis-charpente' AND c.slug = 'conseil-du-pro')
    OR (p.slug = 'guide-empreintes-torx' AND c.slug = 'conseil-du-pro')
  );
