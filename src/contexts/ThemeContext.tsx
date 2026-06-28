import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteTheme, DEFAULT_THEME, hexToHsl } from '@/types/theme';
import { useStorefrontSite } from '@/contexts/StorefrontSiteContext';

interface SiteAsset {
  id: string;
  site_id: string;
  type: 'logo' | 'favicon';
  name: string;
  url: string;
  is_selected: boolean;
}

interface ThemeContextType {
  theme: Partial<SiteTheme>;
  logoUrl: string | null;
  faviconUrl: string | null;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Applique le favicon dynamique
 */
function applyFavicon(faviconUrl: string | null | undefined) {
  if (faviconUrl) {
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = faviconUrl;
  }
}

/**
 * Applique les variables CSS du thème sur :root
 * Convertit les couleurs HEX en HSL pour compatibilité Tailwind
 */
function applyThemeToCSS(theme: Partial<SiteTheme>) {
  const root = document.documentElement;
  
  // Mapping des propriétés du thème vers les variables CSS personnalisées
  const themeVariables: Record<string, string | undefined> = {
    '--theme-primary': theme.primary_color,
    '--theme-secondary': theme.secondary_color,
    '--theme-accent': theme.accent_color,
    '--theme-background': theme.background_color,
    '--theme-text': theme.text_color,
    '--theme-muted': theme.muted_color,
    
    '--theme-button-primary-bg': theme.button_primary_bg,
    '--theme-button-primary-text': theme.button_primary_text,
    '--theme-button-secondary-bg': theme.button_secondary_bg,
    '--theme-button-secondary-text': theme.button_secondary_text,
    
    '--theme-border-color': theme.border_color,
    '--theme-border-radius': theme.border_radius,
    '--theme-border-width': theme.border_width,
    
    '--theme-shadow-sm': theme.shadow_sm,
    '--theme-shadow-md': theme.shadow_md,
    '--theme-shadow-lg': theme.shadow_lg,
    
    '--theme-font-family': theme.font_family,
    '--theme-heading-font': theme.heading_font,
    
    '--theme-header-bg': theme.header_bg,
    '--theme-header-text': theme.header_text,
    '--theme-header-border': theme.header_border,
    '--theme-header-link': theme.header_link,
    '--theme-header-link-hover': theme.header_link_hover,
    
    '--theme-footer-bg': theme.footer_bg,
    '--theme-footer-text': theme.footer_text,
    '--theme-footer-border': theme.footer_border,
    '--theme-footer-link': theme.footer_link,
    '--theme-footer-link-hover': theme.footer_link_hover,
    
    '--theme-nav-bg': theme.nav_bg,
    '--theme-nav-text': theme.nav_text,
    '--theme-nav-active-bg': theme.nav_active_bg,
    '--theme-nav-active-text': theme.nav_active_text,
    '--theme-nav-hover-bg': theme.nav_hover_bg,
    '--theme-nav-hover-text': theme.nav_hover_text,
    
    '--theme-card-bg': theme.card_bg,
    '--theme-card-text': theme.card_text,
    '--theme-card-border': theme.card_border,
    '--theme-card-shadow': theme.card_shadow,
    
    '--theme-success': theme.success_color,
    '--theme-warning': theme.warning_color,
    '--theme-error': theme.error_color,
    '--theme-info': theme.info_color,
    
    '--theme-input-bg': theme.input_bg,
    '--theme-input-text': theme.input_text,
    '--theme-input-border': theme.input_border,
    '--theme-input-focus-border': theme.input_focus_border,
    '--theme-input-placeholder': theme.input_placeholder,
    
    '--theme-link-color': theme.link_color,
    '--theme-link-hover': theme.link_hover_color,
    '--theme-focus-ring': theme.focus_ring_color,
  };
  
  // Appliquer chaque variable CSS personnalisée
  Object.entries(themeVariables).forEach(([key, value]) => {
    if (value) {
      root.style.setProperty(key, value);
    }
  });
  
  // Mettre à jour les variables CSS Tailwind natives (format HSL)
  const tailwindMappings: Record<string, string | undefined> = {
    '--primary': theme.primary_color,
    '--secondary': theme.secondary_color,
    '--accent': theme.accent_color,
    '--background': theme.background_color,
    '--foreground': theme.text_color,
    '--muted': theme.muted_color,
    '--card': theme.card_bg,
    '--card-foreground': theme.card_text,
    '--border': theme.border_color,
    '--input': theme.input_border,
    '--ring': theme.focus_ring_color,
    '--destructive': theme.error_color,
    '--success': theme.success_color,
    '--warning': theme.warning_color,
    '--info': theme.info_color,
  };
  
  Object.entries(tailwindMappings).forEach(([cssVar, hexValue]) => {
    if (hexValue && hexValue.startsWith('#')) {
      const hslValue = hexToHsl(hexValue);
      root.style.setProperty(cssVar, hslValue);
    }
  });
  
  // Appliquer le CSS personnalisé si présent
  if (theme.custom_css) {
    let styleElement = document.getElementById('theme-custom-css');
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'theme-custom-css';
      document.head.appendChild(styleElement);
    }
    styleElement.textContent = theme.custom_css;
  } else {
    // Supprimer le CSS personnalisé si aucun n'est défini
    const existingStyle = document.getElementById('theme-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const [theme, setTheme] = useState<Partial<SiteTheme>>(DEFAULT_THEME);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadTheme() {
    if (siteLoading) return;
    setLoading(true);
    
    try {
      let themeQuery = supabase
        .from('site_themes' as any)
        .select('*')
        .eq('is_active', true);

      if (siteId) {
        themeQuery = themeQuery.eq('site_id', siteId);
      }

      const themeResponse = await themeQuery.maybeSingle();
      
      const themeData = themeResponse.data as unknown as Partial<SiteTheme> | null;
      const themeError = themeResponse.error;

      if (themeData && !themeError) {
        const mergedTheme = { ...DEFAULT_THEME, ...themeData };
        setTheme(mergedTheme);
        applyThemeToCSS(mergedTheme);
        
        const resolvedSiteId = themeData.site_id || siteId;
        if (resolvedSiteId) {
          const assetsResponse = await supabase
            .from('site_assets' as any)
            .select('*')
            .eq('site_id', resolvedSiteId)
            .eq('is_selected', true);
          
          const assets = assetsResponse.data as unknown as SiteAsset[] | null;
          
          if (assets && assets.length > 0) {
            const selectedLogo = assets.find(a => a.type === 'logo');
            const selectedFavicon = assets.find(a => a.type === 'favicon');
            
            if (selectedLogo) {
              setLogoUrl(selectedLogo.url);
            }
            if (selectedFavicon) {
              setFaviconUrl(selectedFavicon.url);
              applyFavicon(selectedFavicon.url);
            }
          }
        }
        
        if (!logoUrl && themeData.logo_url) {
          setLogoUrl(themeData.logo_url);
        }
        if (!faviconUrl && themeData.favicon_url) {
          setFaviconUrl(themeData.favicon_url);
          applyFavicon(themeData.favicon_url);
        }
      } else {
        applyThemeToCSS(DEFAULT_THEME);
        setLogoUrl(null);
        setFaviconUrl(null);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du thème:', err);
      applyThemeToCSS(DEFAULT_THEME);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    void loadTheme();
  }, [siteId, siteLoading]);

  return (
    <ThemeContext.Provider value={{ theme, logoUrl, faviconUrl, loading, refreshTheme: loadTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
