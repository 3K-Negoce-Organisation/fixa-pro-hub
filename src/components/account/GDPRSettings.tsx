import { useState, useEffect } from "react";
import { Shield, Download, Trash2, Mail, Bell, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

interface GDPRSettingsProps {
  user: User;
}

export function GDPRSettings({ user }: GDPRSettingsProps) {
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [newsletterConsent, setNewsletterConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    loadConsents();
  }, [user.id]);

  const loadConsents = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("marketing_consent, newsletter_consent")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      setMarketingConsent(data.marketing_consent ?? false);
      setNewsletterConsent(data.newsletter_consent ?? false);
    }
    setIsLoading(false);
  };

  const handleConsentChange = async (type: "marketing" | "newsletter", value: boolean) => {
    setIsSaving(true);
    
    const updateData = type === "marketing" 
      ? { marketing_consent: value, marketing_consent_date: value ? new Date().toISOString() : null }
      : { newsletter_consent: value, newsletter_consent_date: value ? new Date().toISOString() : null };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour des préférences");
    } else {
      if (type === "marketing") {
        setMarketingConsent(value);
      } else {
        setNewsletterConsent(value);
      }
      toast.success("Préférences mises à jour");
    }
    setIsSaving(false);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("gdpr-export-data", {
        body: { userId: user.id }
      });

      if (error) throw error;

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Vos données ont été exportées avec succès");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Erreur lors de l'export des données");
    }
    setIsExporting(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "SUPPRIMER") {
      toast.error("Veuillez taper SUPPRIMER pour confirmer");
      return;
    }

    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke("gdpr-delete-account", {
        body: { userId: user.id }
      });

      if (error) throw error;

      toast.success("Votre compte a été supprimé");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Erreur lors de la suppression du compte");
    }
    setIsDeleting(false);
    setDeleteDialogOpen(false);
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Consent Management */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Gestion des consentements
        </h3>
        <p className="text-sm text-muted-foreground">
          Gérez vos préférences de communication conformément au RGPD.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="marketing" className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Communications marketing
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir des offres promotionnelles et actualités produits
              </p>
            </div>
            <Switch
              id="marketing"
              checked={marketingConsent}
              onCheckedChange={(value) => handleConsentChange("marketing", value)}
              disabled={isSaving}
            />
          </div>

          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="newsletter" className="font-medium flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Newsletter
              </Label>
              <p className="text-sm text-muted-foreground">
                Recevoir notre newsletter mensuelle avec conseils et guides
              </p>
            </div>
            <Switch
              id="newsletter"
              checked={newsletterConsent}
              onCheckedChange={(value) => handleConsentChange("newsletter", value)}
              disabled={isSaving}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Data Export */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" />
          Droit d'accès - Export de vos données
        </h3>
        <p className="text-sm text-muted-foreground">
          Conformément à l'article 15 du RGPD, vous pouvez télécharger l'ensemble de vos données personnelles.
        </p>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exporter mes données
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Exporter mes données personnelles</DialogTitle>
              <DialogDescription>
                Vous allez télécharger un fichier JSON contenant toutes vos données personnelles :
              </DialogDescription>
            </DialogHeader>
            <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
              <li>Informations de profil (nom, téléphone, adresses)</li>
              <li>Historique des commandes</li>
              <li>Préférences de consentement</li>
              <li>Date de création du compte</li>
            </ul>
            <DialogFooter>
              <Button onClick={handleExportData} disabled={isExporting}>
                {isExporting ? "Export en cours..." : "Télécharger mes données"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Account Deletion */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Droit à l'effacement - Supprimer mon compte
        </h3>
        <p className="text-sm text-muted-foreground">
          Conformément à l'article 17 du RGPD, vous pouvez demander la suppression de votre compte et de toutes vos données.
        </p>

        <div className="p-4 border border-destructive/30 bg-destructive/5 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                Attention : cette action est irréversible
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Toutes vos données personnelles seront supprimées</li>
                <li>Votre historique de commandes sera anonymisé</li>
                <li>Vous ne pourrez plus accéder à votre compte</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>
                  Cette action est irréversible. Votre compte sera définitivement supprimé
                  ainsi que toutes vos données personnelles.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="confirm-delete" className="text-sm font-medium">
                    Pour confirmer, tapez <span className="font-bold">SUPPRIMER</span> ci-dessous :
                  </Label>
                  <Input
                    id="confirm-delete"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="SUPPRIMER"
                  />
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirmation("")}>
                Annuler
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmation !== "SUPPRIMER"}
              >
                {isDeleting ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
