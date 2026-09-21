-- Vidéos YouTube produit (align catalogue / KPMC).
-- Format JSON : [{ "url": "…", "provider": "youtube", "id": "…" }]
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS videos jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.videos IS
  'Vidéos produit (YouTube) — sync catalogue_3k / align prod. Carrousel vitrine.';
