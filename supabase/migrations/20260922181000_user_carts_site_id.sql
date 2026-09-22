ALTER TABLE public.user_carts
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE CASCADE;

-- Backfill legacy rows to vis-a-bois (default storefront)
UPDATE public.user_carts uc
SET site_id = s.id
FROM public.sites s
WHERE uc.site_id IS NULL AND s.slug = 'vis-a-bois' AND s.is_active = true;

-- If still null, any active site
UPDATE public.user_carts uc
SET site_id = s.id
FROM public.sites s
WHERE uc.site_id IS NULL AND s.is_active = true;

ALTER TABLE public.user_carts DROP CONSTRAINT IF EXISTS user_carts_user_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_user_carts_user_site
  ON public.user_carts (user_id, site_id)
  WHERE site_id IS NOT NULL;

-- Keep a unique for any remaining null site_id rows (legacy safety)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_carts_user_null_site
  ON public.user_carts (user_id)
  WHERE site_id IS NULL;
