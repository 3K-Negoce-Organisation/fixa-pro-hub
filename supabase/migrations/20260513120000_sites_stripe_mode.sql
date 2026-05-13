-- Stripe environment per site (mirrors Admin Hub toggle; storefront reads this column).
ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS stripe_mode text NOT NULL DEFAULT 'live';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sites_stripe_mode_check'
  ) THEN
    ALTER TABLE public.sites
      ADD CONSTRAINT sites_stripe_mode_check
      CHECK (stripe_mode = 'live' OR stripe_mode = 'test');
  END IF;
END$$;

COMMENT ON COLUMN public.sites.stripe_mode IS 'Stripe account: live (pk_live/sk_live) or test (pk_test/sk_test).';
