import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Truck, CheckCircle, Clock, XCircle, Search, AlertCircle, Loader2, ShoppingBag, FileText, Home, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { splitOrderTotalsFromItems } from "@/lib/shipping";
import { getDisplayVariantTitle } from "@/lib/products";
import { BoxQuantityHint } from "@/components/cart/BoxQuantityHint";
import { getEdgeFunctionErrorMessage } from "@/lib/edgeFunctionError";

const formatPriceHT = (price: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price) + " HT";
};

const formatPriceTTC = (price: number) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price) + " TTC";
};

type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'manual_intervention' | 'awaiting_payment';

interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  variant_title: string | null;
  designation_fr?: string | null;
  product_description?: string | null;
  quantity: number;
  unit_price_ht: number;
  unit_price_ttc: number;
  box_quantity?: number | null;
}

interface OrderDocument {
  name: string;
  path?: string;
  url: string;
  type?: string;
  uploaded_at?: string;
  source?: string;
}

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_ht: number;
  total_ttc: number;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  tracking_number: string | null;
  carrier: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
  documents: OrderDocument[];
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" />, step: 1 },
  paid: { label: "Payée", color: "bg-emerald-100 text-emerald-800", icon: <CheckCircle className="h-4 w-4" />, step: 2 },
  confirmed: { label: "Confirmée fournisseur", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" />, step: 3 },
  processing: { label: "En préparation", color: "bg-purple-100 text-purple-800", icon: <Package className="h-4 w-4" />, step: 4 },
  shipped: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800", icon: <Truck className="h-4 w-4" />, step: 5 },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" />, step: 6 },
  manual_intervention: { label: "Traitement en cours", color: "bg-amber-100 text-amber-900", icon: <Package className="h-4 w-4" />, step: 4 },
  awaiting_payment: { label: "En attente de paiement", color: "bg-orange-100 text-orange-800", icon: <Clock className="h-4 w-4" />, step: 2 },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" />, step: 0 },
};

const getStatusMeta = (status: string) =>
  statusConfig[status as OrderStatus] ?? {
    label: status.replace(/_/g, " "),
    color: "bg-muted text-muted-foreground",
    icon: <Clock className="h-4 w-4" />,
    step: 1,
  };

const statusSteps = [
  { key: 'pending', label: 'En attente' },
  { key: 'paid', label: 'Payée' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'processing', label: 'Préparation' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'delivered', label: 'Livrée' },
];

const canDownloadCustomerInvoice = (status: OrderStatus) => status === "delivered";

const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderFromUrl = searchParams.get("order");
  const emailFromUrl = searchParams.get("email");
  const tokenFromUrl = searchParams.get("t");
  
  const [orderNumber, setOrderNumber] = useState(orderFromUrl || "");
  const [searchTerm, setSearchTerm] = useState(orderFromUrl || "");
  const [guestEmail, setGuestEmail] = useState(emailFromUrl || "");
  const [guestTrackingToken, setGuestTrackingToken] = useState(tokenFromUrl || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [orderFromGuestLookup, setOrderFromGuestLookup] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const autoSearchKeyRef = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fetch user's orders
  const { data: userOrders, isLoading: loadingUserOrders, refetch: refetchOrders } = useQuery({
    queryKey: ["user-orders"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("[ORDERS] No user found, returning empty");
        return [];
      }

      console.log("[ORDERS] Fetching orders for user:", user.id);
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("[ORDERS] Error fetching orders:", error);
        throw error;
      }
      console.log("[ORDERS] Loaded", data?.length || 0, "orders");
      return data || [];
    },
    staleTime: 0, // Always refetch on mount
    refetchOnMount: true,
    enabled: !!sessionUserId,
  });

  // Auto-search : lien email signé (order + email + jeton)
  useEffect(() => {
    if (orderFromUrl && emailFromUrl && tokenFromUrl) {
      const key = `${orderFromUrl}:${emailFromUrl}:${tokenFromUrl}`;
      if (autoSearchKeyRef.current === key) return;
      autoSearchKeyRef.current = key;
      setGuestTrackingToken(tokenFromUrl);
      void searchGuestOrder(orderFromUrl, emailFromUrl, tokenFromUrl);
      return;
    }

    if (orderFromUrl && emailFromUrl && !tokenFromUrl) {
      setError("Lien de suivi incomplet ou invalide. Ouvrez le lien reçu par email de confirmation.");
      setSearched(true);
      return;
    }

    if (orderFromUrl && sessionUserId) {
      const key = `user:${orderFromUrl}`;
      if (autoSearchKeyRef.current === key) return;
      autoSearchKeyRef.current = key;
      void searchOrder(orderFromUrl);
      return;
    }

    if (sessionUserId && userOrders && userOrders.length > 0 && !order && !searched && !orderFromUrl) {
      const mostRecentOrder = userOrders[0];
      void handleSelectOrder(mostRecentOrder.order_number);
    }
  }, [orderFromUrl, emailFromUrl, tokenFromUrl, userOrders, sessionUserId]);

  // Subscribe to realtime updates when order is loaded (not for guest email lookup — RLS blocks anon channel)
  useEffect(() => {
    if (!order?.order_number || orderFromGuestLookup) {
      // Cleanup previous channel if order is cleared
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }

    // Remove previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Subscribe to order updates
    const channel = supabase
      .channel(`order-updates-${order.order_number}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_number=eq.${order.order_number}`,
        },
        (payload) => {
          console.log('Order update received:', payload);
          const newData = payload.new as {
            status: OrderStatus;
            tracking_number: string | null;
            carrier: string | null;
            updated_at: string;
            documents?: unknown;
          };
          
          // Update order state with new data
          setOrder((prev) => {
            if (!prev) return prev;
            const documents = Array.isArray(newData.documents)
              ? (newData.documents as OrderDocument[])
              : prev.documents;
            return {
              ...prev,
              status: newData.status,
              tracking_number: newData.tracking_number,
              carrier: newData.carrier,
              updated_at: newData.updated_at,
              documents,
            };
          });

          // Show toast notification
          const statusLabel = getStatusMeta(newData.status).label;
          toast.success(`Statut mis à jour : ${statusLabel}`, {
            description: newData.tracking_number 
              ? `Numéro de suivi : ${newData.tracking_number}` 
              : undefined,
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [order?.order_number, orderFromGuestLookup]);

  const searchOrder = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);
    setOrderFromGuestLookup(false);

    const searchTermUpper = term.trim().toUpperCase();

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", searchTermUpper)
      .maybeSingle();

    if (orderError) {
      console.error("Error searching order:", orderError);
      setError("Une erreur est survenue lors de la recherche.");
      setOrder(null);
      setLoading(false);
      return;
    }

    if (!orderData) {
      setOrder(null);
      setLoading(false);
      return;
    }

    const { data: itemsData, error: itemsError } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", orderData.id);

    if (itemsError) {
      console.error("Error loading order items:", itemsError);
    }

    // Parse documents from JSONB
    const documents: OrderDocument[] = Array.isArray(orderData.documents) 
      ? (orderData.documents as unknown as OrderDocument[])
      : [];

    setOrder({
      ...orderData,
      status: orderData.status as OrderStatus,
      order_items: (itemsData || []) as OrderItem[],
      documents,
    });

    setLoading(false);
  };

  const searchGuestOrder = async (term: string, email: string, token: string) => {
    if (!term.trim()) return;
    if (!token.trim()) {
      setError("Lien de suivi invalide. Utilisez le lien reçu par email de confirmation.");
      setSearched(true);
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);
    setOrderFromGuestLookup(false);
    setGuestTrackingToken(token.trim());

    const searchTermUpper = term.trim().toUpperCase();

    const { data, error: fnError } = await supabase.functions.invoke("lookup-order-by-email", {
      body: {
        order_number: searchTermUpper,
        email: email.trim().toLowerCase(),
        token: token.trim(),
      },
    });

    if (fnError || (data && typeof data === "object" && "error" in data && data.error)) {
      const msg =
        (data && typeof data === "object" && "error" in data && String((data as { error: string }).error)) ||
        (await getEdgeFunctionErrorMessage(fnError, "Commande introuvable."));
      setError(msg);
      setOrder(null);
      setLoading(false);
      return;
    }

    const payload = data as { order?: Record<string, unknown>; order_items?: Record<string, unknown>[] };
    if (!payload?.order) {
      setError("Commande introuvable.");
      setOrder(null);
      setLoading(false);
      return;
    }

    const orderData = payload.order;
    const itemsData = payload.order_items || [];

    const documents: OrderDocument[] = Array.isArray(orderData.documents)
      ? (orderData.documents as unknown as OrderDocument[])
      : [];

    setOrder({
      ...(orderData as unknown as Order),
      status: orderData.status as OrderStatus,
      order_items: (itemsData || []) as OrderItem[],
      documents,
    });
    setOrderFromGuestLookup(true);
    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(orderNumber);
    if (sessionUserId) {
      await searchOrder(orderNumber);
      return;
    }
    toast.error("Sans compte, ouvrez le lien « Suivre ma commande » reçu par email.");
  };

  const handleSelectOrder = async (selectedOrderNumber: string) => {
    setOrderNumber(selectedOrderNumber);
    setSearchTerm(selectedOrderNumber);
    await searchOrder(selectedOrderNumber);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatShortDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleDownloadCustomerInvoice = async () => {
    if (!order?.order_number) return;

    try {
      toast.loading("Génération de la facture...", { id: "download-invoice" });

      const body: { order_number: string; email?: string; token?: string } = {
        order_number: order.order_number,
      };
      if (orderFromGuestLookup && guestEmail.trim()) {
        body.email = guestEmail.trim().toLowerCase();
        if (guestTrackingToken.trim()) {
          body.token = guestTrackingToken.trim();
        }
      }

      const { data, error } = await supabase.functions.invoke("download-customer-invoice", {
        body,
      });

      if (error || (data && typeof data === "object" && "error" in data)) {
        throw new Error(
          (data && typeof data === "object" && "error" in data && String((data as { error: string }).error)) ||
            error?.message ||
            "Erreur lors de la génération",
        );
      }

      const payload = data as { pdf_base64?: string; filename?: string };
      if (!payload.pdf_base64) throw new Error("Facture indisponible");

      const byteCharacters = atob(payload.pdf_base64);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }

      const blob = new Blob([byteArray], { type: "application/pdf" });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = payload.filename || `facture_${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      toast.success("Facture téléchargée", { id: "download-invoice" });
    } catch (err) {
      console.error("Customer invoice download error:", err);
      toast.error("Erreur lors du téléchargement de la facture", { id: "download-invoice" });
    }
  };

  const renderProgressBar = (status: OrderStatus) => {
    if (status === 'cancelled') {
      return (
        <div className="flex items-center justify-center py-4 text-red-600">
          <XCircle className="h-6 w-6 mr-2" />
          <span className="font-medium">Commande annulée</span>
        </div>
      );
    }

    const currentStep = getStatusMeta(status).step;

    return (
      <div className="py-4 sm:py-6">
        {/* Mobile: Vertical timeline */}
        <div className="sm:hidden space-y-3">
          {statusSteps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`text-sm font-medium flex-1 ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Desktop: Horizontal progress bar */}
        <div className="hidden sm:flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-4 h-1 bg-muted">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${((currentStep - 1) / (statusSteps.length - 1)) * 100}%` }}
            />
          </div>

          {statusSteps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;

            return (
              <div key={step.key} className="flex flex-col items-center relative z-10 w-16">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`mt-2 text-xs font-medium text-center ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <PageBackground>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Link to="/" className="hover:text-foreground flex items-center gap-1">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">Accueil</span>
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Suivi de commande</span>
        </nav>
        
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-6">Suivi de commande</h1>

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left column: Search + User orders list */}
          <div className="space-y-4 sm:space-y-6">
            {/* Search form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Rechercher une commande</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  {sessionUserId ? (
                    <>
                      <Input
                        type="text"
                        placeholder="Numéro de commande (ex: VIS-202606-ABC123)"
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                      />
                      <Button type="submit" disabled={loading}>
                        <Search className="h-4 w-4 mr-2" />
                        {loading ? "Recherche..." : "Rechercher"}
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Commande passée sans compte ? Ouvrez le lien de suivi reçu par email après votre achat.
                      Vous pouvez aussi{" "}
                      <Link to="/auth" className="text-primary hover:underline">
                        vous connecter
                      </Link>{" "}
                      pour retrouver vos commandes.
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>

            {/* User's orders list */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
                  Mes commandes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!sessionUserId ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Connectez-vous pour voir la liste de vos commandes.
                  </p>
                ) : loadingUserOrders ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : !userOrders || userOrders.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">
                    Aucune commande pour le moment
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {userOrders.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => handleSelectOrder(o.order_number)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors hover:bg-muted/50 ${
                          order?.order_number === o.order_number 
                            ? "border-primary bg-primary/5" 
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{o.order_number}</span>
                          <Badge className={`${getStatusMeta(o.status).color} text-xs`}>
                            {getStatusMeta(o.status).label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatShortDate(o.created_at)}</span>
                          <span>{formatPriceTTC(o.total_ttc)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: Order details */}
          <div className="lg:col-span-2">
            {/* Error state */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="flex items-center gap-3 py-6">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                  <p className="text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Loading state */}
            {loading && (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </CardContent>
              </Card>
            )}

            {/* No result state */}
            {searched && !order && !error && !loading && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Commande introuvable
                  </h2>
                  <p className="text-muted-foreground mb-6 text-center">
                    Aucune commande trouvée avec ce numéro. Vérifiez le numéro et réessayez.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Initial state - no search yet */}
            {!searched && !order && orderFromUrl && !tokenFromUrl && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Lien de suivi invalide
                  </h2>
                  <p className="text-muted-foreground max-w-md">
                    Utilisez le lien complet reçu par email de confirmation (il contient un code de sécurité).
                  </p>
                </CardContent>
              </Card>
            )}

            {!searched && !order && !orderFromUrl && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Recherchez une commande
                  </h2>
                  <p className="text-muted-foreground text-center">
                    Connectez-vous pour retrouver vos commandes, ou ouvrez le lien reçu par email.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Order found */}
            {order && !loading && (
              <div className="space-y-6">
                {/* Order header */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">
                          Commande #{order.order_number}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Passée le {formatDate(order.created_at)}
                        </p>
                      </div>
                      <Badge className={`${getStatusMeta(order.status).color} flex items-center gap-1 self-start`}>
                        {getStatusMeta(order.status).icon}
                        {getStatusMeta(order.status).label}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    {renderProgressBar(order.status)}

                    {canDownloadCustomerInvoice(order.status) && (
                      <div className="mt-4 pt-4 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          className="gap-2"
                          onClick={handleDownloadCustomerInvoice}
                        >
                          <FileText className="h-4 w-4" />
                          Télécharger la facture client
                        </Button>
                        <p className="text-xs text-muted-foreground mt-2">
                          Récapitulatif avec les prix payés et le détail de votre panier.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Tracking info */}
                {order.tracking_number && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Suivi de livraison
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Transporteur</p>
                          <p className="font-medium text-foreground">{order.carrier || "Non spécifié"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Numéro de suivi</p>
                          <p className="font-mono font-medium text-foreground">{order.tracking_number}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shipping address */}
                {order.shipping_address && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-semibold text-foreground mb-3">Adresse de livraison</h3>
                      <p className="text-muted-foreground">
                        {order.shipping_address}<br />
                        {order.shipping_postal_code} {order.shipping_city}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Order items */}
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold text-foreground mb-4">Articles commandés</h3>
                    
                    {/* Mobile: Card-based layout */}
                    <div className="sm:hidden space-y-3">
                      {order.order_items.map((item) => (
                        <div key={item.id} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                          {item.product_image && (
                            <img
                              src={item.product_image}
                              alt={item.product_title}
                              className="w-12 h-12 object-contain rounded border shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground text-sm line-clamp-2">
                              {item.product_title}
                            </p>
                            {item.designation_fr && item.designation_fr !== item.product_title && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {item.designation_fr}
                              </p>
                            )}
                            {getDisplayVariantTitle(item.variant_title) && (
                              <p className="text-xs text-muted-foreground">
                                {getDisplayVariantTitle(item.variant_title)}
                              </p>
                            )}
                            <BoxQuantityHint
                              boxQuantity={item.box_quantity}
                              variantTitle={item.variant_title}
                            />
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">Qté: {item.quantity}</span>
                              <span className="text-sm font-medium">{formatPriceHT(item.unit_price_ht * item.quantity)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Desktop: Table layout */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-center">Qté</TableHead>
                            <TableHead className="text-right">Prix HT</TableHead>
                            <TableHead className="text-right">Total HT</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {order.order_items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {item.product_image && (
                                    <img
                                      src={item.product_image}
                                      alt={item.product_title}
                                      className="w-12 h-12 object-contain rounded border"
                                    />
                                  )}
                                  <div>
                                    <p className="font-medium text-foreground">
                                      {item.product_title}
                                    </p>
                                    {item.designation_fr && item.designation_fr !== item.product_title && (
                                      <p className="text-sm text-muted-foreground">
                                        {item.designation_fr}
                                      </p>
                                    )}
                                    {getDisplayVariantTitle(item.variant_title) && (
                                      <p className="text-sm text-muted-foreground">
                                        {getDisplayVariantTitle(item.variant_title)}
                                      </p>
                                    )}
                                    <BoxQuantityHint
                                      boxQuantity={item.box_quantity}
                                      variantTitle={item.variant_title}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">
                                {formatPriceHT(item.unit_price_ht)}
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatPriceHT(item.unit_price_ht * item.quantity)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Totals */}
                    <div className="border-t mt-4 pt-4">
                      <div className="flex justify-end">
                        <div className="space-y-1 text-right">
                          {(() => {
                            const { productsHT, shippingHT } = splitOrderTotalsFromItems(
                              order.order_items,
                              order.total_ht,
                            );
                            return (
                              <>
                                <p className="text-sm text-muted-foreground">
                                  Sous-total produits HT :{" "}
                                  <span className="text-foreground">{formatPriceHT(productsHT)}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Frais de livraison HT :{" "}
                                  <span className="text-foreground">
                                    {shippingHT > 0 ? formatPriceHT(shippingHT) : "Gratuite"}
                                  </span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Total TTC: <span className="font-semibold text-foreground">{formatPriceTTC(order.total_ttc)}</span>
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Total HT: <span className="text-foreground">{formatPriceHT(order.total_ht)}</span>
                                </p>
                                <p className="text-xs text-muted-foreground max-w-sm pt-2">
                                  Le PDF envoyé au fournisseur affiche les prix d&apos;achat et les quantités en
                                  unités (éléments), pas les boîtes du panier. Le montant payé est celui indiqué
                                  ci-dessus.
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default OrderTrackingPage;