import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Building2, Mail, MapPin, Phone, Hash, Store } from "lucide-react";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SupplierSettings {
  id: string;
  name: string;
  email: string;
  status_email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  customer_number: string | null;
}

interface SupplierSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupplierSettingsDialog({ open, onOpenChange }: SupplierSettingsDialogProps) {
  const queryClient = useQueryClient();
  const { siteSlug } = useStorefrontSite();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SupplierSettings | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);
  const [storefrontPublic, setStorefrontPublic] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const [supplierRes, siteRes] = await Promise.all([
        supabase.from("supplier_settings").select("*").maybeSingle(),
        supabase
          .from("sites")
          .select("id, storefront_public")
          .eq("slug", siteSlug)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      if (supplierRes.error) throw supplierRes.error;
      setSettings(supplierRes.data);

      if (siteRes.error) {
        console.error("Error fetching site:", siteRes.error);
        setSiteId(null);
        setStorefrontPublic(false);
      } else if (siteRes.data) {
        setSiteId(siteRes.data.id);
        setStorefrontPublic(Boolean(siteRes.data.storefront_public));
      } else {
        setSiteId(null);
        setStorefrontPublic(false);
      }
    } catch (error: unknown) {
      console.error("Error fetching supplier settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("supplier_settings")
        .update({
          name: settings.name,
          email: settings.email,
          status_email: settings.status_email,
          address: settings.address,
          postal_code: settings.postal_code,
          city: settings.city,
          phone: settings.phone,
          customer_number: settings.customer_number,
        })
        .eq("id", settings.id);

      if (error) throw error;

      if (siteId) {
        const { error: siteErr } = await supabase
          .from("sites")
          .update({ storefront_public: storefrontPublic })
          .eq("id", siteId);
        if (siteErr) throw siteErr;
        await queryClient.invalidateQueries({ queryKey: ["storefront-public", siteSlug] });
      }

      toast.success("Paramètres enregistrés");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving supplier settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SupplierSettings, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value || null });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Paramètres Fournisseur
          </DialogTitle>
          <DialogDescription>
            Configurez les informations du fournisseur pour l'envoi des commandes
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : settings ? (
          <div className="space-y-6 py-4">
            {siteId && (
              <div className="space-y-3 rounded-lg border border-border p-4 bg-muted/30">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  Boutique en ligne
                </h3>
                <p className="text-xs text-muted-foreground">
                  Si désactivé, seuls les comptes connectés peuvent voir le catalogue et commander. Si activé, tout le monde peut acheter sans compte ; l&apos;inscription publique (avec validation par email) est proposée sur la page de connexion.
                </p>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="storefront-public" className="cursor-pointer">
                    Ouverture au public (navigation + commande invité)
                  </Label>
                  <Switch
                    id="storefront-public"
                    checked={storefrontPublic}
                    onCheckedChange={setStorefrontPublic}
                  />
                </div>
              </div>
            )}

            {/* Informations générales */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Informations générales
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom du fournisseur</Label>
                  <Input
                    id="name"
                    value={settings.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Ex: Alsafix"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_number">Numéro client fournisseur</Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customer_number"
                      value={settings.customer_number || ""}
                      onChange={(e) => updateField("customer_number", e.target.value)}
                      placeholder="Ex: 000001"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Ce numéro apparaîtra sur les bons de commande envoyés au fournisseur
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={settings.phone || ""}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="Ex: 03 88 00 00 00"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Emails */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Emails
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="email">Email d'envoi des commandes *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="Ex: commandes@fournisseur.fr"
                  />
                  <p className="text-xs text-muted-foreground">
                    Cet email recevra les récapitulatifs de commandes
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status_email">Email de réception des statuts</Label>
                  <Input
                    id="status_email"
                    type="email"
                    value={settings.status_email || ""}
                    onChange={(e) => updateField("status_email", e.target.value)}
                    placeholder="Ex: statuts@vis-a-bois.fr"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email pour recevoir les mises à jour de statut (optionnel)
                  </p>
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Adresse
              </h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    value={settings.address || ""}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Ex: 12 rue de l'Industrie"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">Code postal</Label>
                    <Input
                      id="postal_code"
                      value={settings.postal_code || ""}
                      onChange={(e) => updateField("postal_code", e.target.value)}
                      placeholder="Ex: 67000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Ville</Label>
                    <Input
                      id="city"
                      value={settings.city || ""}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Ex: Strasbourg"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
            </Button>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Aucun paramètre trouvé
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
