-- Table pour stocker plusieurs logos et favicons par site
CREATE TABLE IF NOT EXISTS public.site_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('logo', 'favicon')),
  name VARCHAR NOT NULL,
  url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour les requêtes
CREATE INDEX IF NOT EXISTS idx_site_assets_site_type ON public.site_assets(site_id, type);

-- Trigger pour updated_at (idempotent)
DROP TRIGGER IF EXISTS update_site_assets_updated_at ON public.site_assets;
CREATE TRIGGER update_site_assets_updated_at
  BEFORE UPDATE ON public.site_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent)
DROP POLICY IF EXISTS "Anyone can read site_assets" ON public.site_assets;
CREATE POLICY "Anyone can read site_assets" ON public.site_assets
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert site_assets" ON public.site_assets;
CREATE POLICY "Admins can insert site_assets" ON public.site_assets
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update site_assets" ON public.site_assets;
CREATE POLICY "Admins can update site_assets" ON public.site_assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete site_assets" ON public.site_assets;
CREATE POLICY "Admins can delete site_assets" ON public.site_assets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );