-- =====================================================
-- Migration: Alignement avec la base Admin (multi-sites)
-- =====================================================

-- 1. Créer la fonction alias pour compatibilité avec les migrations admin
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2. Créer la table sites
CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_sites_updated_at
  BEFORE UPDATE ON public.sites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active sites" ON public.sites
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage sites" ON public.sites
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Insérer le site par défaut
INSERT INTO public.sites (slug, name, is_active)
VALUES ('vis-a-bois', 'Vis à Bois', true);

-- 3. Supprimer l'ancienne table site_themes si elle existe et la recréer complète
DROP TABLE IF EXISTS public.site_themes CASCADE;

CREATE TABLE public.site_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  name VARCHAR DEFAULT 'Thème par défaut',
  
  -- Couleurs principales
  primary_color VARCHAR DEFAULT '#93441B',
  secondary_color VARCHAR DEFAULT '#F1F4F7',
  accent_color VARCHAR DEFAULT '#FCB95B',
  background_color VARCHAR DEFAULT '#FFFFFF',
  text_color VARCHAR DEFAULT '#333333',
  muted_color VARCHAR DEFAULT '#737373',
  
  -- Boutons
  button_primary_bg VARCHAR DEFAULT '#93441B',
  button_primary_text VARCHAR DEFAULT '#FAFAFA',
  button_secondary_bg VARCHAR DEFAULT '#F1F4F7',
  button_secondary_text VARCHAR DEFAULT '#333333',
  
  -- Bordures
  border_color VARCHAR DEFAULT '#D6DEE6',
  border_radius VARCHAR DEFAULT '0.375rem',
  border_width VARCHAR DEFAULT '1px',
  
  -- Ombres
  shadow_sm VARCHAR DEFAULT '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow_md VARCHAR DEFAULT '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  shadow_lg VARCHAR DEFAULT '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  
  -- Typographie
  font_family VARCHAR DEFAULT 'Inter, sans-serif',
  heading_font VARCHAR DEFAULT 'Inter, sans-serif',
  
  -- Header
  header_bg VARCHAR DEFAULT '#93441B',
  header_text VARCHAR DEFAULT '#FAFAFA',
  header_border VARCHAR DEFAULT '#7a3816',
  header_link VARCHAR DEFAULT '#FAFAFA',
  header_link_hover VARCHAR DEFAULT '#FCB95B',
  
  -- Footer
  footer_bg VARCHAR DEFAULT '#18181B',
  footer_text VARCHAR DEFAULT '#737373',
  footer_border VARCHAR DEFAULT '#27272A',
  footer_link VARCHAR DEFAULT '#737373',
  footer_link_hover VARCHAR DEFAULT '#FAFAFA',
  
  -- Navigation
  nav_bg VARCHAR DEFAULT '#F1F4F7',
  nav_text VARCHAR DEFAULT '#333333',
  nav_active_bg VARCHAR DEFAULT '#93441B',
  nav_active_text VARCHAR DEFAULT '#FAFAFA',
  nav_hover_bg VARCHAR DEFAULT '#EBEEF1',
  nav_hover_text VARCHAR DEFAULT '#333333',
  
  -- Cartes
  card_bg VARCHAR DEFAULT '#FFFFFF',
  card_text VARCHAR DEFAULT '#333333',
  card_border VARCHAR DEFAULT '#D6DEE6',
  card_shadow VARCHAR DEFAULT '0 1px 3px rgba(0,0,0,0.1)',
  
  -- Formulaires
  input_bg VARCHAR DEFAULT '#FFFFFF',
  input_text VARCHAR DEFAULT '#333333',
  input_border VARCHAR DEFAULT '#D6DEE6',
  input_focus_border VARCHAR DEFAULT '#F97316',
  input_placeholder VARCHAR DEFAULT '#94a3b8',
  
  -- États
  success_color VARCHAR DEFAULT '#16A34A',
  warning_color VARCHAR DEFAULT '#F59E0B',
  error_color VARCHAR DEFAULT '#EF4444',
  info_color VARCHAR DEFAULT '#0080FF',
  
  -- Liens
  link_color VARCHAR DEFAULT '#93441B',
  link_hover_color VARCHAR DEFAULT '#7a3816',
  focus_ring_color VARCHAR DEFAULT '#F97316',
  
  -- Branding (legacy - pour compatibilité)
  logo_url TEXT,
  favicon_url TEXT,
  
  -- CSS personnalisé
  custom_css TEXT,
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER update_site_themes_updated_at
  BEFORE UPDATE ON public.site_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.site_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active themes" ON public.site_themes
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage themes" ON public.site_themes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Créer la table site_assets
CREATE TABLE IF NOT EXISTS public.site_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL CHECK (type IN ('logo', 'favicon')),
  name VARCHAR NOT NULL,
  url TEXT NOT NULL,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_assets_site_type ON public.site_assets(site_id, type);

CREATE TRIGGER update_site_assets_updated_at
  BEFORE UPDATE ON public.site_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.site_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assets" ON public.site_assets
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage assets" ON public.site_assets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Créer la table custom_themes
CREATE TABLE IF NOT EXISTS public.custom_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  theme_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_themes_site ON public.custom_themes(site_id);

CREATE TRIGGER update_custom_themes_updated_at
  BEFORE UPDATE ON public.custom_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view custom themes" ON public.custom_themes
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage custom themes" ON public.custom_themes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- 6. Créer le bucket site-logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-logos', 'site-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies pour le bucket site-logos
CREATE POLICY "Anyone can view site logos" ON storage.objects
  FOR SELECT USING (bucket_id = 'site-logos');

CREATE POLICY "Admins can upload site logos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'site-logos' 
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can update site logos" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'site-logos'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete site logos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'site-logos'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- 7. Insérer le thème par défaut actif
INSERT INTO public.site_themes (site_id, name, is_active)
SELECT id, 'Thème Vis à Bois', true
FROM public.sites
WHERE slug = 'vis-a-bois';