import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, AlertCircle, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Le mot de passe actuel est requis"),
  newPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "Le nouveau mot de passe doit être différent de l'actuel",
  path: ["newPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface PasswordChangeFormProps {
  userEmail: string;
}

function mapPasswordError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("incorrect")) {
    return "Mot de passe actuel incorrect";
  }
  if (lower.includes("session") || lower.includes("jwt") || lower.includes("non autorisé")) {
    return "Session expirée. Reconnectez-vous puis réessayez.";
  }
  return message;
}

export const PasswordChangeForm = ({ userEmail }: PasswordChangeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const recoveryRedirectTo = `${window.location.origin}/auth?type=recovery`;

  const handleSubmit = async (values: PasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Session expirée. Reconnectez-vous.");
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke("change-own-password", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: {
          current_password: values.currentPassword,
          new_password: values.newPassword,
        },
      });

      if (invokeError) {
        console.error("change-own-password invoke error:", invokeError, data);
        let message = data?.error ? String(data.error) : invokeError.message;
        const context = (invokeError as { context?: Response }).context;
        if (!data?.error && context) {
          try {
            const body = await context.json();
            if (body?.error) message = String(body.error);
          } catch {
            // ignore parse errors
          }
        }
        toast.error(mapPasswordError(message || "Erreur lors de la modification du mot de passe"));
        return;
      }

      if (data?.error) {
        toast.error(mapPasswordError(String(data.error)));
        return;
      }

      const { error: refreshError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: values.newPassword,
      });

      if (refreshError) {
        console.warn("Password updated but session refresh failed:", refreshError);
        toast.success("Mot de passe mis à jour. Reconnectez-vous avec votre nouveau mot de passe.");
      } else {
        toast.success("Mot de passe mis à jour");
      }

      setPasswordUpdated(true);
      form.reset();
    } catch (err) {
      console.error("Exception updating password:", err);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetLink = async () => {
    if (!userEmail) {
      toast.error("Adresse email introuvable");
      return;
    }

    setIsSendingLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: recoveryRedirectTo,
      });

      if (error) {
        console.error("Error sending reset link:", error);
        toast.error(error.message || "Impossible d'envoyer le lien de réinitialisation");
      } else {
        setLinkSent(true);
        toast.success("Un lien de réinitialisation a été envoyé par email");
      }
    } catch (err) {
      console.error("Exception sending reset link:", err);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsSendingLink(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Lock className="h-5 w-5 text-primary" />
        Mot de passe
      </h3>

      {passwordUpdated && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Votre mot de passe a été modifié avec succès.
          </AlertDescription>
        </Alert>
      )}

      {linkSent && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Un email contenant un lien de réinitialisation a été envoyé à <strong>{userEmail}</strong>.
          </AlertDescription>
        </Alert>
      )}

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Saisissez votre mot de passe actuel pour confirmer votre identité, puis choisissez un nouveau
          mot de passe. Vous pouvez aussi recevoir un lien sécurisé par email.
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="currentPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mot de passe actuel</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" className="pl-10" autoComplete="current-password" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nouveau mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" className="pl-10" autoComplete="new-password" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="password" className="pl-10" autoComplete="new-password" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Enregistrement..." : "Modifier mon mot de passe"}
          </Button>
        </form>
      </Form>

      <div className="border-t pt-4 space-y-3">
        <p className="text-sm text-muted-foreground">
          Préférez recevoir un lien par email ?
        </p>
        <Button
          type="button"
          variant="outline"
          disabled={isSendingLink}
          onClick={handleSendResetLink}
          className="gap-2"
        >
          <Mail className="h-4 w-4" />
          {isSendingLink ? "Envoi en cours..." : "Envoyer un lien de réinitialisation"}
        </Button>
      </div>
    </div>
  );
};
