import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save, Building2, Mail, MapPin, Phone } from "lucide-react";

interface SupplierSettings {
  id: string;
  name: string;
  email: string;
  status_email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
}

const AdminSupplierPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SupplierSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("supplier_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (error: any) {
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
        })
        .eq("id", settings.id);

      if (error) throw error;
      toast.success("Paramètres enregistrés");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/commandes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Paramètres Fournisseur</h1>
            <p className="text-muted-foreground">
              Configurez les informations du fournisseur pour l'envoi des commandes
            </p>
          </div>
        </div>

        {settings && (
          <div className="grid gap-6 max-w-2xl">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Informations générales
                </CardTitle>
                <CardDescription>
                  Nom et coordonnées du fournisseur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Emails
                </CardTitle>
                <CardDescription>
                  Adresses email pour l'envoi et la réception des commandes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Adresse
                </CardTitle>
                <CardDescription>
                  Adresse postale du fournisseur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Enregistrement..." : "Enregistrer les paramètres"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupplierPage;
