-- Create custom_themes table for shared themes across admins (idempotent)
CREATE TABLE IF NOT EXISTS public.custom_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  icon_id VARCHAR NOT NULL DEFAULT 'palette',
  theme_data JSONB NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for site queries
CREATE INDEX IF NOT EXISTS idx_custom_themes_site_id ON public.custom_themes(site_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_custom_themes_updated_at ON public.custom_themes;
CREATE TRIGGER update_custom_themes_updated_at
  BEFORE UPDATE ON public.custom_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent: drop then create)
DROP POLICY IF EXISTS "Anyone can read custom_themes" ON public.custom_themes;
CREATE POLICY "Anyone can read custom_themes" ON public.custom_themes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert custom_themes" ON public.custom_themes;
CREATE POLICY "Admins can insert custom_themes" ON public.custom_themes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update custom_themes" ON public.custom_themes;
CREATE POLICY "Admins can update custom_themes" ON public.custom_themes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete custom_themes" ON public.custom_themes;
CREATE POLICY "Admins can delete custom_themes" ON public.custom_themes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );