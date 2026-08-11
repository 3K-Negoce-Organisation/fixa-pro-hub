-- Gamme catalogue associée au site (vitrine = sub_category via category_product).
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS gamme_id uuid REFERENCES public.gammes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sites_gamme_id ON public.sites(gamme_id);

COMMENT ON COLUMN public.sites.gamme_id IS
  'Gamme catalogue du site : la vitrine affiche les sub_category liées via category_product.';

-- Vis-à-Bois → vissage
UPDATE public.sites s
SET gamme_id = g.id
FROM public.gammes g
WHERE s.slug = 'vis-a-bois'
  AND g.slug = 'vissage'
  AND (s.gamme_id IS NULL OR s.gamme_id IS DISTINCT FROM g.id);
