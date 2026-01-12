import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, LogOut, MapPin, Phone, Package, ChevronRight, Eye, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { GDPRSettings } from "@/components/account/GDPRSettings";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

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
  same_as_billing: z.boolean().default(true)
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const statusLabels: Record<string, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  processing: "En préparation",
  shipped: "Expédiée",
  delivered: "Livrée",
  cancelled: "Annulée"
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

const AccountPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
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
      same_as_billing: true
    }
  });
  const sameAsBilling = form.watch("same_as_billing");
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        // Defer Supabase calls with setTimeout to avoid deadlock
        setTimeout(() => {
          loadProfile(session.user.id);
        }, 0);
      }
    });

    // THEN check for existing session
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
    const {
      data,
      error
    } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
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
        same_as_billing: data.same_as_billing ?? true
      });
    }
    setIsLoading(false);
  };

  const loadOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error loading orders:", error.message, error.code, error.details);
        // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas de commandes
        if (error.code !== 'PGRST116') {
          toast.error("Erreur lors du chargement des commandes");
        }
        setOrders([]);
      } else {
        setOrders(data || []);
      }
    } catch (err) {
      console.error("Exception loading orders:", err);
      setOrders([]);
    }
    setOrdersLoading(false);
  };

  useEffect(() => {
    if (user) {
      loadOrders(user.id);
    }
  }, [user]);
  const handleSaveProfile = async (values: ProfileFormValues) => {
    if (!user) return;
    setIsSaving(true);
    const updateData = {
      ...values,
      shipping_address: values.same_as_billing ? values.billing_address : values.shipping_address,
      shipping_city: values.same_as_billing ? values.billing_city : values.shipping_city,
      shipping_postal_code: values.same_as_billing ? values.billing_postal_code : values.shipping_postal_code
    };
    const {
      error
    } = await supabase.from("profiles").update(updateData).eq("user_id", user.id);
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
      <PageBackground>
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-muted-foreground">Chargement...</div>
        </main>
        <Footer />
      </PageBackground>
    );
  }
  return (
    <PageBackground>
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
              <h1 className="text-2xl font-bold">Mon compte</h1>
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
              <User className="h-4 w-4 mr-2" />
              Coordonnées
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 mr-2" />
              Mes commandes
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              Vie privée & RGPD
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="bg-card border border-border rounded-lg p-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSaveProfile)} className="space-y-6">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Informations personnelles
                    </h2>
                    <div className="grid md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="company_name" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Nom complet</FormLabel>
                            <FormControl>
                              <Input placeholder="Jean Dupont" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                      <FormField control={form.control} name="phone" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Téléphone</FormLabel>
                            <FormControl>
                                <div className="relative">
                                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input placeholder="04 XX XX XX XX" className="pl-10" {...field} />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>
                    </div>

                    {/* Billing Address */}
                    <div className="space-y-4">
                      <h2 className="text-lg font-semibold flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Adresse de facturation
                      </h2>
                      <div className="grid md:grid-cols-3 gap-4">
                        <FormField control={form.control} name="billing_address" render={({
                        field
                      }) => <FormItem className="md:col-span-3">
                              <FormLabel>Adresse</FormLabel>
                              <FormControl>
                                <Input placeholder="123 rue de l'Industrie" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        <FormField control={form.control} name="billing_postal_code" render={({
                        field
                      }) => <FormItem>
                              <FormLabel>Code postal</FormLabel>
                              <FormControl>
                                <Input placeholder="69000" maxLength={5} {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                        <FormField control={form.control} name="billing_city" render={({
                        field
                      }) => <FormItem className="md:col-span-2">
                              <FormLabel>Ville</FormLabel>
                              <FormControl>
                                <Input placeholder="Lyon" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>} />
                      </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          Adresse de livraison
                        </h2>
                        <FormField control={form.control} name="same_as_billing" render={({
                        field
                      }) => <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                Identique à l'adresse de facturation
                              </FormLabel>
                            </FormItem>} />
                      </div>

                      {!sameAsBilling && <div className="grid md:grid-cols-3 gap-4">
                          <FormField control={form.control} name="shipping_address" render={({
                        field
                      }) => <FormItem className="md:col-span-3">
                                <FormLabel>Adresse</FormLabel>
                                <FormControl>
                                  <Input placeholder="123 rue de l'Industrie" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                          <FormField control={form.control} name="shipping_postal_code" render={({
                        field
                      }) => <FormItem>
                                <FormLabel>Code postal</FormLabel>
                                <FormControl>
                                  <Input placeholder="69000" maxLength={5} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                          <FormField control={form.control} name="shipping_city" render={({
                        field
                      }) => <FormItem className="md:col-span-2">
                                <FormLabel>Ville</FormLabel>
                                <FormControl>
                                  <Input placeholder="Lyon" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>} />
                        </div>}
                    </div>

                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <div className="bg-card border border-border rounded-lg p-6">
                {ordersLoading ? (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground">Chargement des commandes...</div>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">Aucune commande</h2>
                    <p className="text-muted-foreground mb-4">
                      Vous n'avez pas encore passé de commande.
                    </p>
                    <Button asChild>
                      <Link to="/produits">Découvrir nos produits</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° Commande</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Total HT</TableHead>
                          <TableHead className="text-right">Total TTC</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>
                              {new Date(order.created_at).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric"
                              })}
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[order.status] || "bg-gray-100 text-gray-800"}>
                                {statusLabels[order.status] || order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(order.total_ht).toFixed(2)} € HT
                            </TableCell>
                            <TableCell className="text-right">
                              {Number(order.total_ttc).toFixed(2)} € TTC
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" asChild>
                                <Link to={`/suivi?order=${order.order_number}`}>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Suivre
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="privacy">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Vie privée & RGPD
                  </h2>
                  <p className="text-muted-foreground mt-1">
                    Gérez vos données personnelles conformément au Règlement Général sur la Protection des Données.
                  </p>
                </div>
                {user && <GDPRSettings user={user} />}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
};
export default AccountPage;