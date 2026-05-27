import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStorefrontPublic } from "@/hooks/useStorefrontPublic";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { PasswordRecoveryForm } from "@/components/auth/PasswordRecoveryForm";

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

const signupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const AuthPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: storefrontPublic } = useStorefrontPublic();
  const signupOpen = storefrontPublic === true;
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);

  const recoveryRedirectTo = `${window.location.origin}/auth?type=recovery`;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (searchParams.get("type") === "recovery") {
      setRecoveryMode(true);
    }
  }, [searchParams]);

  useEffect(() => {
    const isRecoveryUrl = searchParams.get("type") === "recovery";

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          setRecoveryMode(true);
          return;
        }
        if (session?.user && !recoveryMode && !isRecoveryUrl) {
          navigate("/");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !isRecoveryUrl && !recoveryMode) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, recoveryMode, searchParams]);

  useEffect(() => {
    if (!signupOpen && activeTab === "signup") {
      setActiveTab("login");
    }
  }, [signupOpen, activeTab]);

  const handleLogin = async (values: LoginFormValues) => {
    setIsLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou mot de passe incorrect");
      } else {
        toast.error(error.message);
      }
      setIsLoading(false);
      return;
    }

    // Force session to be set (helps when the auth event is missed / storage is flaky)
    if (data?.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    toast.success("Connexion réussie");
    navigate("/");
    setIsLoading(false);
  };

  const ALLOWED_EMAILS = [
    "pierre.kabore@gmail.com",
    "christophe.kabore@gmail.com",
    "kaborematthieu@gmail.com"
  ];

  const handleSignup = async (values: SignupFormValues) => {
    setIsLoading(true);

    if (!signupOpen) {
      if (!ALLOWED_EMAILS.includes(values.email.toLowerCase())) {
        toast.error("L'inscription est réservée aux utilisateurs autorisés.");
        setIsLoading(false);
        return;
      }
    }

    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Un compte existe déjà avec cet email");
      } else {
        toast.error(error.message);
      }
    } else if (signupOpen) {
      if (data.user && !data.session) {
        toast.success("Vérifiez votre boîte mail", {
          description:
            "Un lien de confirmation vous a été envoyé. Cliquez dessus pour activer votre compte, puis reconnectez-vous.",
        });
      } else if (data.session) {
        toast.success("Compte créé avec succès !");
        navigate("/");
      }
    } else {
      toast.success("Compte créé avec succès ! Vous êtes maintenant connecté.");
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async () => {
    const email = forgotEmail.trim() || loginForm.getValues("email").trim();
    if (!email) {
      toast.error("Indiquez votre adresse email");
      return;
    }

    setIsSendingResetLink(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: recoveryRedirectTo,
      });

      if (error) {
        console.error("Forgot password error:", error);
        toast.error("Impossible d'envoyer le lien de réinitialisation");
      } else {
        toast.success("Un lien de réinitialisation a été envoyé par email");
        setShowForgotPassword(false);
      }
    } catch (err) {
      console.error("Forgot password exception:", err);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsSendingResetLink(false);
    }
  };

  const handleRecoverySuccess = async () => {
    setRecoveryMode(false);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex items-center justify-center py-12">
        <div className="w-full max-w-md mx-4">
          <div className="text-center mb-8">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold">Connexion</h1>
            <p className="text-muted-foreground">
              Accédez à votre compte
            </p>
          </div>

          {searchParams.get("reason") === "private" && (
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Boutique réservée</AlertTitle>
              <AlertDescription>
                La boutique n&apos;est pas ouverte au public. Connectez-vous avec un compte autorisé pour continuer.
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-card border border-border rounded-lg p-6">
            {recoveryMode ? (
              <PasswordRecoveryForm onSuccess={handleRecoverySuccess} />
            ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={`grid w-full mb-6 ${signupOpen ? "grid-cols-2" : "grid-cols-1"}`}>
                <TabsTrigger value="login">Connexion</TabsTrigger>
                {signupOpen ? <TabsTrigger value="signup">Inscription</TabsTrigger> : null}
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="contact@entreprise.fr"
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
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Connexion..." : "Se connecter"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        className="text-sm text-primary hover:underline"
                        onClick={() => {
                          setForgotEmail(loginForm.getValues("email"));
                          setShowForgotPassword((prev) => !prev);
                        }}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>

                    {showForgotPassword && (
                      <div className="rounded-md border border-border p-4 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Saisissez votre email pour recevoir un lien de réinitialisation.
                        </p>
                        <Input
                          type="email"
                          placeholder="contact@entreprise.fr"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={isSendingResetLink}
                          onClick={handleForgotPassword}
                        >
                          {isSendingResetLink ? "Envoi en cours..." : "Envoyer le lien"}
                        </Button>
                      </div>
                    )}
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="signup">
                {signupOpen ? (
                  <p className="text-sm text-muted-foreground mb-4">
                    Après inscription, vous recevez un email de confirmation : votre compte n&apos;est actif qu&apos;après validation du lien.
                  </p>
                ) : null}
                <Form {...signupForm}>
                  <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
                    <FormField
                      control={signupForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="email"
                                placeholder="contact@entreprise.fr"
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
                      control={signupForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
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
                      control={signupForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmer le mot de passe</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="password"
                                placeholder="••••••••"
                                className="pl-10"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? "Création..." : "Créer mon compte"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AuthPage;
