export interface SiteTheme {
  id: string;
  
  // Couleurs principales
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  muted_color: string;
  
  // Boutons
  button_primary_bg: string;
  button_primary_text: string;
  button_secondary_bg: string;
  button_secondary_text: string;
  
  // Bordures
  border_color: string;
  border_radius: string;
  
  // Ombres
  shadow_sm: string;
  shadow_md: string;
  shadow_lg: string;
  
  // Typographie
  font_family: string;
  heading_font: string;
  
  // Header
  header_bg: string;
  header_text: string;
  header_link_hover: string;
  
  // Footer
  footer_bg: string;
  footer_text: string;
  footer_link_hover: string;
  
  // Navigation
  nav_bg: string;
  nav_text: string;
  nav_active_bg: string;
  nav_active_text: string;
  nav_hover_bg: string;
  
  // Cartes
  card_bg: string;
  card_text: string;
  card_border: string;
  
  // États
  success_color: string;
  warning_color: string;
  error_color: string;
  info_color: string;
  
  // Formulaires
  input_bg: string;
  input_border: string;
  input_focus_border: string;
  
  // Liens
  link_color: string;
  link_hover_color: string;
  focus_ring_color: string;
  
  // CSS personnalisé
  custom_css: string | null;
  
  // Métadonnées
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_THEME: Omit<SiteTheme, 'id' | 'created_at' | 'updated_at'> = {
  primary_color: '#93441B',
  secondary_color: '#F1F4F7',
  accent_color: '#FCB95B',
  background_color: '#FFFFFF',
  text_color: '#333333',
  muted_color: '#737373',
  
  button_primary_bg: '#93441B',
  button_primary_text: '#FAFAFA',
  button_secondary_bg: '#F1F4F7',
  button_secondary_text: '#333333',
  
  border_color: '#D6DEE6',
  border_radius: '0.375rem',
  
  shadow_sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  shadow_md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  shadow_lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  
  font_family: 'Inter, sans-serif',
  heading_font: 'Inter, sans-serif',
  
  header_bg: '#93441B',
  header_text: '#FAFAFA',
  header_link_hover: '#FCB95B',
  
  footer_bg: '#18181B',
  footer_text: '#737373',
  footer_link_hover: '#FAFAFA',
  
  nav_bg: '#F1F4F7',
  nav_text: '#333333',
  nav_active_bg: '#93441B',
  nav_active_text: '#FAFAFA',
  nav_hover_bg: '#EBEEF1',
  
  card_bg: '#FFFFFF',
  card_text: '#333333',
  card_border: '#D6DEE6',
  
  success_color: '#16A34A',
  warning_color: '#F59E0B',
  error_color: '#EF4444',
  info_color: '#0080FF',
  
  input_bg: '#FFFFFF',
  input_border: '#D6DEE6',
  input_focus_border: '#F97316',
  
  link_color: '#93441B',
  link_hover_color: '#7a3816',
  focus_ring_color: '#F97316',
  
  custom_css: null,
  is_active: true,
};

/**
 * Convertit une couleur HEX en valeur HSL (sans le préfixe "hsl()")
 * Compatible avec les variables CSS Tailwind qui utilisent le format "H S% L%"
 */
export function hexToHsl(hex: string): string {
  // Retirer le # si présent
  hex = hex.replace(/^#/, '');
  
  // Parser les composantes RGB
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  // Retourner au format Tailwind: "H S% L%" (sans parenthèses ni virgules)
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
