import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Copy, X, ChevronDown, ChevronUp, Bug } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { TechnicalError } from "@/hooks/useAdminErrorHandler";

interface AdminErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: TechnicalError | null;
  allErrors?: TechnicalError[];
  onClearAll?: () => void;
}

export const AdminErrorDialog = ({
  open,
  onOpenChange,
  error,
  allErrors = [],
  onClearAll,
}: AdminErrorDialogProps) => {
  const [showHistory, setShowHistory] = useState(false);

  if (!error) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  };

  const formatErrorForCopy = (err: TechnicalError) => {
    return `
=== ERREUR TECHNIQUE ===
Timestamp: ${format(err.timestamp, "PPpp", { locale: fr })}
Message: ${err.message}
${err.code ? `Code: ${err.code}` : ""}
${err.context ? `Contexte: ${err.context}` : ""}
${err.details ? `Détails: ${err.details}` : ""}
${err.hint ? `Indication: ${err.hint}` : ""}
${err.stack ? `\nStack Trace:\n${err.stack}` : ""}
`.trim();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Bug className="h-5 w-5" />
            Erreur Technique (Admin)
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-1">
            {/* Erreur actuelle */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">
                    {format(error.timestamp, "PPpp", { locale: fr })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(formatErrorForCopy(error))}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copier
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Message</span>
                  <p className="text-sm font-mono bg-background/50 p-2 rounded mt-1 break-all">
                    {error.message}
                  </p>
                </div>

                {error.code && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Code</span>
                    <Badge variant="outline" className="ml-2 font-mono">
                      {error.code}
                    </Badge>
                  </div>
                )}

                {error.context && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Contexte</span>
                    <p className="text-sm text-muted-foreground mt-1">{error.context}</p>
                  </div>
                )}

                {error.details && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Détails</span>
                    <p className="text-sm font-mono bg-background/50 p-2 rounded mt-1 break-all">
                      {error.details}
                    </p>
                  </div>
                )}

                {error.hint && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Indication</span>
                    <p className="text-sm text-blue-600 mt-1">{error.hint}</p>
                  </div>
                )}

                {error.stack && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Stack Trace</span>
                    <pre className="text-xs font-mono bg-background/50 p-2 rounded mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Historique des erreurs */}
            {allErrors.length > 1 && (
              <div className="border rounded-lg">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">
                    Historique ({allErrors.length} erreurs)
                  </span>
                  {showHistory ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>

                {showHistory && (
                  <div className="border-t max-h-48 overflow-y-auto">
                    {allErrors.slice(1).map((err) => (
                      <div
                        key={err.id}
                        className="p-3 border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {format(err.timestamp, "Pp", { locale: fr })}
                          </span>
                          {err.code && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {err.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm mt-1 line-clamp-2">{err.message}</p>
                        {err.context && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {err.context}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between pt-4 border-t">
          {onClearAll && allErrors.length > 0 && (
            <Button variant="outline" size="sm" onClick={onClearAll}>
              Effacer l'historique
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="ml-auto"
          >
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
