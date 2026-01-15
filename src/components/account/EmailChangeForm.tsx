import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailChangeSchema = z.object({
  newEmail: z.string().trim().email("Adresse email invalide").max(255, "L'email ne doit pas dépasser 255 caractères"),
  confirmEmail: z.string().trim().email("Adresse email invalide"),
}).refine((data) => data.newEmail === data.confirmEmail, {
  message: "Les adresses email ne correspondent pas",
  path: ["confirmEmail"],
});

type EmailChangeFormValues = z.infer<typeof emailChangeSchema>;

interface EmailChangeFormProps {
  currentEmail: string;
}

export const EmailChangeForm = ({ currentEmail }: EmailChangeFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema),
    defaultValues: {
      newEmail: "",
      confirmEmail: "",
    },
  });

  const handleSubmit = async (values: EmailChangeFormValues) => {
    if (values.newEmail.toLowerCase() === currentEmail.toLowerCase()) {
      toast.error("La nouvelle adresse email doit être différente de l'actuelle");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: values.newEmail,
      });

      if (error) {
        console.error("Error updating email:", error);
        if (error.message.includes("already registered")) {
          toast.error("Cette adresse email est déjà utilisée par un autre compte");
        } else {
          toast.error("Erreur lors de la modification de l'email");
        }
      } else {
        setEmailSent(true);
        form.reset();
        toast.success("Un email de confirmation a été envoyé");
      }
    } catch (err) {
      console.error("Exception updating email:", err);
      toast.error("Une erreur inattendue s'est produite");
    }
    
    setIsSubmitting(false);
  };

  if (emailSent) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Modifier mon email
        </h3>
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Email de confirmation envoyé !</strong>
            <br />
            Un lien de confirmation a été envoyé à votre nouvelle adresse email.
            Cliquez sur ce lien pour valider le changement.
            <br />
            <span className="text-sm text-green-600 mt-2 block">
              Votre email actuel ({currentEmail}) restera actif jusqu'à la confirmation.
            </span>
          </AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => setEmailSent(false)}>
          Modifier une autre adresse
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Mail className="h-5 w-5 text-primary" />
        Modifier mon email
      </h3>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Email actuel :</strong> {currentEmail}
          <br />
          <span className="text-sm text-muted-foreground">
            Un email de confirmation sera envoyé à la nouvelle adresse pour valider le changement.
          </span>
        </AlertDescription>
      </Alert>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="newEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nouvelle adresse email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="nouvelle@email.com"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmer la nouvelle adresse email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="nouvelle@email.com"
                      className="pl-10"
                      {...field}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Envoi en cours..." : "Modifier mon email"}
          </Button>
        </form>
      </Form>
    </div>
  );
};
