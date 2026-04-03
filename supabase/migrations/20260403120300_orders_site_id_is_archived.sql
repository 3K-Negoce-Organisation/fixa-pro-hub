-- Colonnes commandes présentes en legacy (multi-site, archivage)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL;
