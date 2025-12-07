import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, LogOut, Building2, MapPin, Phone, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { User as SupabaseUser } from "@supabase/supabase-js";

const profileSchema = z.object({
  company_name: z.string().max(100).optional(),
  siret: z.string().max(14).optional(),
  phone: z.string().max(20).optional(),
  billing_address: z.string().max(200).optional(),
  billing_city: z.string().max(100).optional(),
  billing_postal_code: z.string().max(10).optional(),
  shipping_address: z.string().max(200).optional(),
  shipping_city: z.string().max(100).optional(),
  shipping_postal_code: z.string().max(10).optional(),
  same_as_billing: z.boolean().default(true),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      company_name: "",
      siret: "",
      phone: "",
      billing_address: "",
      billing_city: "",
      billing_postal_code: "",
      shipping_address: "",
      shipping_city: "",
      shipping_postal_code: "",
      same_as_billing: true,
    },
  });

  const sameAsBilling = form.watch("same_as_billing");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      form.reset({
        company_name: data.company_name || "",
        siret: data.siret || "",
        phone: data.phone || "",
        billing_address: data.billing_address || "",
        billing_city: data.billing_city || "",
        billing_postal_code: data.billing_postal_code || "",
        shipping_address: data.shipping_address || "",
        shipping_city: data.shipping_city || "",
        shipping_postal_code: data.shipping_postal_code || "",
        same_as_billing: data.same_as_billing ?? true,
      });
    }
    setIsLoading(false);
  };

  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);

    const updateData = {
      ...values,
      shipping_address: values.same_as_billing ? values.billing_address : values.shipping_address,
      shipping_city: values.same_as_billing ? values.billing_city : values.shipping_city,
      shipping_postal_code: values.same_as_billing ? values.billing_postal_code : values.shipping_postal_code,
    };

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("user_id", user.id);

    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour");
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
    navigate("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Chargement...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground">Accueil</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Mon compte</span>
          </nav>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Mon compte Pro</h1>
              <p className="text-muted-foreground">{user?.email}</p>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList>
              <TabsTrigger value="profile">
                <Building2 className="h-4 w-4 mr-2" />
                Mon entreprise
              </TabsTrigger>
              <TabsTrigger value="orders">
                <Package className="h-4 w-4 mr-2" />
                Mes commandes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="bg-card border border-border rounded-lg p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-6">
                    {/* Company Info */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Informations entreprise
                      </h2>
                      <div className="grid md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="company_name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Raison sociale</FormLabel>
                              <FormControl>
                                <Input placeholder="Mon Entreprise SARL" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="siret"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SIRET</FormLabel>
                              <FormControl>
                                <Input placeholder="12345678901234" maxLength={14} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Téléphone</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="04 XX XX XX XX" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Adresse de facturation
                      </h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="billing_address"
                          render={({ field }) => (
                            <FormItem className="md:col-span-3">
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <Input placeholder="123 rue de l'Industrie" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billing_postal_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Code postal</FormLabel>
                              <FormControl>
                                <Input placeholder="69000" maxLength={5} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="billing_city"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Ville</FormLabel>
                              <FormControl>
                                <Input placeholder="Lyon" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          Adresse de livraison
                        </h2>
                        <FormField
                          control={form.control}
                          name="same_as_billing"
                          render={({ field }) => (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Identique à l'adresse de facturation
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      </div>

                      {!sameAsBilling && (
                        <div className="grid md:grid-cols-3 gap-4">
                          <FormField
                            control={form.control}
                            name="shipping_address"
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>Adresse</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 rue de l'Industrie" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shipping_postal_code"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Code postal</FormLabel>
                                <FormControl>
                                  <Input placeholder="69000" maxLength={5} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="shipping_city"
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Ville</FormLabel>
                                <FormControl>
                                  <Input placeholder="Lyon" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="bg-card border border-border rounded-lg p-6 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">Aucune commande</h2>
                <p className="text-muted-foreground mb-4">
                  Vous n'avez pas encore passé de commande.
                </p>
                <Button asChild>
                  <Link to="/produits">Découvrir nos produits</Link>
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AccountPage;
