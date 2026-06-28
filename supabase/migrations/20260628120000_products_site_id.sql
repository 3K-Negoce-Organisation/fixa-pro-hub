-- Multi-site : produits rattachés à un site (aligné admin-hub-central)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_products_site_id ON public.products(site_id);

UPDATE public.products p
SET site_id = c.site_id
FROM public.categories c
WHERE p.category_id IS NOT NULL
  AND p.category_id = c.id
  AND c.site_id IS NOT NULL
  AND p.site_id IS NULL;

UPDATE public.products
SET site_id = (
  SELECT id FROM public.sites
  WHERE slug = 'vis-a-bois' AND is_active = true
  LIMIT 1
)
WHERE site_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.sites WHERE slug = 'vis-a-bois' AND is_active = true
  );

UPDATE public.products
SET site_id = (
  SELECT id FROM public.sites
  WHERE is_active = true
  ORDER BY created_at ASC NULLS LAST
  LIMIT 1
)
WHERE site_id IS NULL
  AND EXISTS (SELECT 1 FROM public.sites WHERE is_active = true);
