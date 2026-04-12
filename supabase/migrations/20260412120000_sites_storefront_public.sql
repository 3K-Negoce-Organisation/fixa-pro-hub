-- Public storefront toggle: when false (default), only authenticated users can browse (enforced in app + payment Edge Functions).
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS storefront_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.sites.storefront_public IS 'If true, anonymous users may browse the storefront and pay as guest.';
