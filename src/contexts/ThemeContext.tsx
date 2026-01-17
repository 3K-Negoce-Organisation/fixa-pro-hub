import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SiteTheme, DEFAULT_THEME, hexToHsl } from '@/types/theme';

interface ThemeContextType {
  theme: Partial<SiteTheme>;
  loading: boolean;
  refreshTheme: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Applique les variables CSS du thème sur :root
 * Convertit les couleurs HEX en HSL pour compatibilité Tailwind
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

function applyThemeToCSS(theme: Partial<SiteTheme>) {
  const root = document.documentElement;
  
  // Appliquer le favicon dynamique
  applyFavicon(theme.favicon_url);
  
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
    
    '--theme-shadow-sm': theme.shadow_sm,
    '--theme-shadow-md': theme.shadow_md,
    '--theme-shadow-lg': theme.shadow_lg,
    
    '--theme-font-family': theme.font_family,
    '--theme-heading-font': theme.heading_font,
    
    '--theme-header-bg': theme.header_bg,
    '--theme-header-text': theme.header_text,
    '--theme-header-link-hover': theme.header_link_hover,
    
    '--theme-footer-bg': theme.footer_bg,
    '--theme-footer-text': theme.footer_text,
    '--theme-footer-link-hover': theme.footer_link_hover,
    
    '--theme-nav-bg': theme.nav_bg,
    '--theme-nav-text': theme.nav_text,
    '--theme-nav-active-bg': theme.nav_active_bg,
    '--theme-nav-active-text': theme.nav_active_text,
    '--theme-nav-hover-bg': theme.nav_hover_bg,
    
    '--theme-card-bg': theme.card_bg,
    '--theme-card-text': theme.card_text,
    '--theme-card-border': theme.card_border,
    
    '--theme-success': theme.success_color,
    '--theme-warning': theme.warning_color,
    '--theme-error': theme.error_color,
    '--theme-info': theme.info_color,
    
    '--theme-input-bg': theme.input_bg,
    '--theme-input-border': theme.input_border,
    '--theme-input-focus-border': theme.input_focus_border,
    
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
  const [theme, setTheme] = useState<Partial<SiteTheme>>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);

  async function loadTheme() {
    setLoading(true);
    
    try {
      // Utiliser any pour contourner le typage strict car site_themes n'est pas dans les types générés
      const response = await supabase
        .from('site_themes' as any)
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      const data = response.data as unknown as Partial<SiteTheme> | null;
      const error = response.error;

      if (data && !error) {
        const mergedTheme = { ...DEFAULT_THEME, ...data };
        setTheme(mergedTheme);
        applyThemeToCSS(mergedTheme);
      } else {
        // Utiliser le thème par défaut si aucun thème actif trouvé
        applyThemeToCSS(DEFAULT_THEME);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du thème:', err);
      applyThemeToCSS(DEFAULT_THEME);
    }
    
    setLoading(false);
  }

  useEffect(() => {
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme: loadTheme }}>
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
