import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Download, RefreshCw, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const LogoPreviewPage = () => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const generateLogo = async () => {
    setLoading(true);
    setMessage("");
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-logo');
      
      if (error) {
        console.error('Error:', error);
        toast.error(error.message || "Erreur lors de la génération");
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      if (data?.image) {
        setLogoUrl(data.image);
        setMessage(data.message || "Logo généré avec succès !");
        toast.success("Logo généré avec succès !");
      } else {
        toast.error("Aucune image reçue");
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error("Erreur lors de la génération du logo");
    } finally {
      setLoading(false);
    }
  };

  const downloadLogo = () => {
    if (!logoUrl) return;
    
    const link = document.createElement('a');
    link.href = logoUrl;
    link.download = 'logo-artisanal.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Logo téléchargé !");
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Générateur de Logo Artisanal</CardTitle>
            <CardDescription>
              Générez un logo avec une vis à bois dans un style gravure sur bois vintage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preview Area */}
            <div className="aspect-square bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-muted-foreground">Génération en cours...</p>
                  <p className="text-sm text-muted-foreground">Cela peut prendre quelques secondes</p>
                </div>
              ) : logoUrl ? (
                <img 
                  src={logoUrl} 
                  alt="Logo généré" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-4 text-muted-foreground">
                  <ImageIcon className="h-16 w-16" />
                  <p>Cliquez sur "Générer" pour créer votre logo</p>
                </div>
              )}
            </div>

            {/* Message */}
            {message && (
              <p className="text-center text-sm text-muted-foreground">{message}</p>
            )}

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={generateLogo} 
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération...
                  </>
                ) : logoUrl ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Régénérer
                  </>
                ) : (
                  <>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Générer le logo
                  </>
                )}
              </Button>
              
              {logoUrl && (
                <Button 
                  onClick={downloadLogo}
                  variant="outline"
                  size="lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="text-center text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p>Style : Tampon/badge artisan abstrait</p>
              <p>Couleurs : Marron, sépia, crème</p>
              <p>Aspect : Cachet vintage usé</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LogoPreviewPage;
