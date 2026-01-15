import { useState, useEffect } from "react";
import { Palette, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { SiteTheme, DEFAULT_THEME, hexToHsl } from "@/types/theme";

interface ThemeSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-2 mt-1">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-8 rounded border border-border cursor-pointer"
          />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-8 text-xs font-mono"
            placeholder="#000000"
          />
        </div>
      </div>
    </div>
  );
}

export function ThemeSettingsDialog({ open, onOpenChange }: ThemeSettingsDialogProps) {
  const { theme: currentTheme, refreshTheme } = useTheme();
  const [formData, setFormData] = useState<Partial<SiteTheme>>({});
  const [loading, setLoading] = useState(false);
  const [themeId, setThemeId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadThemeData();
    }
  }, [open]);

  async function loadThemeData() {
    try {
      const response = await supabase
        .from('site_themes' as any)
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      const data = response.data as unknown as SiteTheme | null;
      const error = response.error;

      if (data && !error) {
        setFormData(data);
        setThemeId(data.id);
      } else {
        setFormData({ ...DEFAULT_THEME });
        setThemeId(null);
      }
    } catch (err) {
      console.error('Erreur lors du chargement du thème:', err);
      setFormData({ ...DEFAULT_THEME });
    }
  }

  function updateField(field: keyof SiteTheme, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Appliquer le changement en temps réel pour preview
    const root = document.documentElement;
    const cssVarName = `--theme-${field.replace(/_/g, '-')}`;
    root.style.setProperty(cssVarName, value);
    
    // Mettre à jour aussi les variables Tailwind si c'est une couleur principale
    const tailwindMappings: Record<string, string> = {
      primary_color: '--primary',
      secondary_color: '--secondary',
      accent_color: '--accent',
      background_color: '--background',
      text_color: '--foreground',
      muted_color: '--muted',
      border_color: '--border',
      error_color: '--destructive',
    };
    
    if (tailwindMappings[field] && value.startsWith('#')) {
      root.style.setProperty(tailwindMappings[field], hexToHsl(value));
    }
  }

  async function handleSave() {
    setLoading(true);
    try {
      const dataToSave = {
        ...formData,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (themeId) {
        // Update existing theme
        const response = await supabase
          .from('site_themes' as any)
          .update(dataToSave)
          .eq('id', themeId);

        if (response.error) throw response.error;
      } else {
        // Create new theme
        const response = await supabase
          .from('site_themes' as any)
          .insert([dataToSave]);

        if (response.error) throw response.error;
      }

      toast.success("Thème sauvegardé avec succès");
      await refreshTheme();
      onOpenChange(false);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      toast.error("Erreur lors de la sauvegarde du thème");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFormData({ ...DEFAULT_THEME });
    
    // Appliquer les valeurs par défaut en temps réel
    Object.entries(DEFAULT_THEME).forEach(([key, value]) => {
      if (typeof value === 'string') {
        const cssVarName = `--theme-${key.replace(/_/g, '-')}`;
        document.documentElement.style.setProperty(cssVarName, value);
      }
    });
    
    toast.info("Thème réinitialisé aux valeurs par défaut");
  }

  function handleCancel() {
    // Restaurer le thème actuel
    refreshTheme();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Personnalisation du thème
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="colors" className="flex-1">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="colors">Couleurs</TabsTrigger>
            <TabsTrigger value="buttons">Boutons</TabsTrigger>
            <TabsTrigger value="header">Header/Footer</TabsTrigger>
            <TabsTrigger value="forms">Formulaires</TabsTrigger>
            <TabsTrigger value="advanced">Avancé</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[50vh] mt-4">
            <div className="pr-4">
              <TabsContent value="colors" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <ColorField
                    label="Couleur primaire"
                    value={formData.primary_color || DEFAULT_THEME.primary_color}
                    onChange={(v) => updateField('primary_color', v)}
                  />
                  <ColorField
                    label="Couleur secondaire"
                    value={formData.secondary_color || DEFAULT_THEME.secondary_color}
                    onChange={(v) => updateField('secondary_color', v)}
                  />
                  <ColorField
                    label="Couleur d'accent"
                    value={formData.accent_color || DEFAULT_THEME.accent_color}
                    onChange={(v) => updateField('accent_color', v)}
                  />
                  <ColorField
                    label="Couleur de fond"
                    value={formData.background_color || DEFAULT_THEME.background_color}
                    onChange={(v) => updateField('background_color', v)}
                  />
                  <ColorField
                    label="Couleur du texte"
                    value={formData.text_color || DEFAULT_THEME.text_color}
                    onChange={(v) => updateField('text_color', v)}
                  />
                  <ColorField
                    label="Couleur atténuée"
                    value={formData.muted_color || DEFAULT_THEME.muted_color}
                    onChange={(v) => updateField('muted_color', v)}
                  />
                  <ColorField
                    label="Couleur de bordure"
                    value={formData.border_color || DEFAULT_THEME.border_color}
                    onChange={(v) => updateField('border_color', v)}
                  />
                  <ColorField
                    label="Couleur des liens"
                    value={formData.link_color || DEFAULT_THEME.link_color}
                    onChange={(v) => updateField('link_color', v)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">États</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField
                      label="Succès"
                      value={formData.success_color || DEFAULT_THEME.success_color}
                      onChange={(v) => updateField('success_color', v)}
                    />
                    <ColorField
                      label="Avertissement"
                      value={formData.warning_color || DEFAULT_THEME.warning_color}
                      onChange={(v) => updateField('warning_color', v)}
                    />
                    <ColorField
                      label="Erreur"
                      value={formData.error_color || DEFAULT_THEME.error_color}
                      onChange={(v) => updateField('error_color', v)}
                    />
                    <ColorField
                      label="Information"
                      value={formData.info_color || DEFAULT_THEME.info_color}
                      onChange={(v) => updateField('info_color', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="buttons" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <ColorField
                    label="Bouton primaire - Fond"
                    value={formData.button_primary_bg || DEFAULT_THEME.button_primary_bg}
                    onChange={(v) => updateField('button_primary_bg', v)}
                  />
                  <ColorField
                    label="Bouton primaire - Texte"
                    value={formData.button_primary_text || DEFAULT_THEME.button_primary_text}
                    onChange={(v) => updateField('button_primary_text', v)}
                  />
                  <ColorField
                    label="Bouton secondaire - Fond"
                    value={formData.button_secondary_bg || DEFAULT_THEME.button_secondary_bg}
                    onChange={(v) => updateField('button_secondary_bg', v)}
                  />
                  <ColorField
                    label="Bouton secondaire - Texte"
                    value={formData.button_secondary_text || DEFAULT_THEME.button_secondary_text}
                    onChange={(v) => updateField('button_secondary_text', v)}
                  />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Navigation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField
                      label="Nav - Fond"
                      value={formData.nav_bg || DEFAULT_THEME.nav_bg}
                      onChange={(v) => updateField('nav_bg', v)}
                    />
                    <ColorField
                      label="Nav - Texte"
                      value={formData.nav_text || DEFAULT_THEME.nav_text}
                      onChange={(v) => updateField('nav_text', v)}
                    />
                    <ColorField
                      label="Nav active - Fond"
                      value={formData.nav_active_bg || DEFAULT_THEME.nav_active_bg}
                      onChange={(v) => updateField('nav_active_bg', v)}
                    />
                    <ColorField
                      label="Nav active - Texte"
                      value={formData.nav_active_text || DEFAULT_THEME.nav_active_text}
                      onChange={(v) => updateField('nav_active_text', v)}
                    />
                    <ColorField
                      label="Nav hover - Fond"
                      value={formData.nav_hover_bg || DEFAULT_THEME.nav_hover_bg}
                      onChange={(v) => updateField('nav_hover_bg', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="header" className="space-y-4 mt-0">
                <div>
                  <h4 className="font-medium text-sm mb-3">Header</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField
                      label="Header - Fond"
                      value={formData.header_bg || DEFAULT_THEME.header_bg}
                      onChange={(v) => updateField('header_bg', v)}
                    />
                    <ColorField
                      label="Header - Texte"
                      value={formData.header_text || DEFAULT_THEME.header_text}
                      onChange={(v) => updateField('header_text', v)}
                    />
                    <ColorField
                      label="Header - Lien hover"
                      value={formData.header_link_hover || DEFAULT_THEME.header_link_hover}
                      onChange={(v) => updateField('header_link_hover', v)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Footer</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField
                      label="Footer - Fond"
                      value={formData.footer_bg || DEFAULT_THEME.footer_bg}
                      onChange={(v) => updateField('footer_bg', v)}
                    />
                    <ColorField
                      label="Footer - Texte"
                      value={formData.footer_text || DEFAULT_THEME.footer_text}
                      onChange={(v) => updateField('footer_text', v)}
                    />
                    <ColorField
                      label="Footer - Lien hover"
                      value={formData.footer_link_hover || DEFAULT_THEME.footer_link_hover}
                      onChange={(v) => updateField('footer_link_hover', v)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Cartes</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <ColorField
                      label="Carte - Fond"
                      value={formData.card_bg || DEFAULT_THEME.card_bg}
                      onChange={(v) => updateField('card_bg', v)}
                    />
                    <ColorField
                      label="Carte - Texte"
                      value={formData.card_text || DEFAULT_THEME.card_text}
                      onChange={(v) => updateField('card_text', v)}
                    />
                    <ColorField
                      label="Carte - Bordure"
                      value={formData.card_border || DEFAULT_THEME.card_border}
                      onChange={(v) => updateField('card_border', v)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="forms" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <ColorField
                    label="Input - Fond"
                    value={formData.input_bg || DEFAULT_THEME.input_bg}
                    onChange={(v) => updateField('input_bg', v)}
                  />
                  <ColorField
                    label="Input - Bordure"
                    value={formData.input_border || DEFAULT_THEME.input_border}
                    onChange={(v) => updateField('input_border', v)}
                  />
                  <ColorField
                    label="Input - Bordure focus"
                    value={formData.input_focus_border || DEFAULT_THEME.input_focus_border}
                    onChange={(v) => updateField('input_focus_border', v)}
                  />
                  <ColorField
                    label="Focus ring"
                    value={formData.focus_ring_color || DEFAULT_THEME.focus_ring_color}
                    onChange={(v) => updateField('focus_ring_color', v)}
                  />
                  <ColorField
                    label="Lien hover"
                    value={formData.link_hover_color || DEFAULT_THEME.link_hover_color}
                    onChange={(v) => updateField('link_hover_color', v)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Police principale</Label>
                    <Input
                      value={formData.font_family || DEFAULT_THEME.font_family}
                      onChange={(e) => updateField('font_family', e.target.value)}
                      className="mt-1"
                      placeholder="Inter, sans-serif"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Police des titres</Label>
                    <Input
                      value={formData.heading_font || DEFAULT_THEME.heading_font}
                      onChange={(e) => updateField('heading_font', e.target.value)}
                      className="mt-1"
                      placeholder="Inter, sans-serif"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Border radius</Label>
                    <Input
                      value={formData.border_radius || DEFAULT_THEME.border_radius}
                      onChange={(e) => updateField('border_radius', e.target.value)}
                      className="mt-1"
                      placeholder="0.375rem"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm mb-3">Ombres</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Shadow SM</Label>
                      <Input
                        value={formData.shadow_sm || DEFAULT_THEME.shadow_sm}
                        onChange={(e) => updateField('shadow_sm', e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Shadow MD</Label>
                      <Input
                        value={formData.shadow_md || DEFAULT_THEME.shadow_md}
                        onChange={(e) => updateField('shadow_md', e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Shadow LG</Label>
                      <Input
                        value={formData.shadow_lg || DEFAULT_THEME.shadow_lg}
                        onChange={(e) => updateField('shadow_lg', e.target.value)}
                        className="mt-1 font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">CSS personnalisé</Label>
                  <Textarea
                    value={formData.custom_css || ''}
                    onChange={(e) => updateField('custom_css', e.target.value)}
                    className="mt-1 font-mono text-xs min-h-[120px]"
                    placeholder="/* Ajoutez votre CSS personnalisé ici */"
                  />
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="flex justify-between items-center gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Réinitialiser
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
