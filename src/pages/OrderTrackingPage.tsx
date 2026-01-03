import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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
import { Package, Truck, CheckCircle, Clock, XCircle, Search, AlertCircle, Loader2, ShoppingBag, FileText, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

// Download document via fetch to avoid ad-blocker issues
const downloadDocument = async (url: string, fileName: string) => {
  try {
    toast.loading("Téléchargement en cours...", { id: "download" });
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erreur de téléchargement");
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
    
    toast.success("Document téléchargé", { id: "download" });
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Erreur lors du téléchargement", { id: "download" });
  }
};

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

type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItem {
  id: string;
  product_id: string;
  product_title: string;
  product_image: string | null;
  variant_title: string | null;
  quantity: number;
  unit_price_ht: number;
  unit_price_ttc: number;
}

interface OrderDocument {
  name: string;
  path: string;
  url: string;
  type: string;
  uploaded_at: string;
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
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" />, step: 0 },
};

const statusSteps = [
  { key: 'pending', label: 'En attente' },
  { key: 'paid', label: 'Payée' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'processing', label: 'Préparation' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'delivered', label: 'Livrée' },
];

const OrderTrackingPage = () => {
  const [searchParams] = useSearchParams();
  const orderFromUrl = searchParams.get("order");
  
  const [orderNumber, setOrderNumber] = useState(orderFromUrl || "");
  const [searchTerm, setSearchTerm] = useState(orderFromUrl || "");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!orderFromUrl);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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
  });

  // Auto-search when order number is in URL or select most recent order
  useEffect(() => {
    if (orderFromUrl) {
      searchOrder(orderFromUrl);
    } else if (userOrders && userOrders.length > 0 && !order && !searched) {
      // Auto-select most recent order if no search has been made
      const mostRecentOrder = userOrders[0];
      handleSelectOrder(mostRecentOrder.order_number);
    }
  }, [orderFromUrl, userOrders]);

  // Subscribe to realtime updates when order is loaded
  useEffect(() => {
    if (!order?.order_number) {
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
          };
          
          // Update order state with new data
          setOrder((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              status: newData.status,
              tracking_number: newData.tracking_number,
              carrier: newData.carrier,
              updated_at: newData.updated_at,
            };
          });

          // Show toast notification
          const statusLabel = statusConfig[newData.status]?.label || newData.status;
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
  }, [order?.order_number]);

  const searchOrder = async (term: string) => {
    if (!term.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

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
      order_items: itemsData || [],
      documents,
    });

    setLoading(false);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(orderNumber);
    await searchOrder(orderNumber);
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

  // Map documents to status steps for display
  const getDocumentsForStep = (stepKey: string): OrderDocument[] => {
    if (!order?.documents) return [];
    
    // Map step keys to document name patterns
    const stepDocPatterns: Record<string, string[]> = {
      'paid': ['commande', 'order', 'bon_de_commande'],
      'confirmed': ['confirmation', 'accuse'],
      'processing': ['preparation'],
      'shipped': ['expedition', 'livraison', 'facture', 'invoice', 'bon_de_livraison'],
      'delivered': ['livraison', 'delivery'],
    };

    const patterns = stepDocPatterns[stepKey] || [];
    if (patterns.length === 0) return [];

    return order.documents.filter(doc => {
      const docNameLower = doc.name.toLowerCase();
      return patterns.some(pattern => docNameLower.includes(pattern));
    });
  };

  // Get all documents that don't match any step pattern (show on current step)
  const getUnmappedDocuments = (): OrderDocument[] => {
    if (!order?.documents) return [];
    
    const allPatterns = ['commande', 'order', 'bon_de_commande', 'confirmation', 'accuse', 
      'preparation', 'expedition', 'livraison', 'facture', 'invoice', 'bon_de_livraison', 'delivery'];
    
    return order.documents.filter(doc => {
      const docNameLower = doc.name.toLowerCase();
      return !allPatterns.some(pattern => docNameLower.includes(pattern));
    });
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

    const currentStep = statusConfig[status].step;
    const unmappedDocs = getUnmappedDocuments();

    return (
      <TooltipProvider>
        <div className="py-6">
          <div className="flex items-center justify-between relative">
            {/* Progress line */}
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
              
              // Get documents for this step
              let stepDocs = getDocumentsForStep(step.key);
              
              // Add unmapped docs to current step
              if (isCurrent) {
                stepDocs = [...stepDocs, ...unmappedDocs];
              }
              
              return (
                <div key={step.key} className="flex flex-col items-center relative z-10 w-16">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      isCompleted 
                        ? 'bg-primary text-primary-foreground' 
                        : isCurrent 
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' 
                          : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="h-4 w-4" /> : stepNumber}
                  </div>
                  <span className={`mt-2 text-xs font-medium text-center ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
                    {step.label}
                  </span>
                  
                  {/* Document icons - fixed height container */}
                  <div className="h-6 flex items-center justify-center gap-1 mt-1">
                    {stepDocs.map((doc, docIndex) => (
                      <Tooltip key={docIndex}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-muted transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocument(doc.url, doc.name);
                            }}
                          >
                            <FileText className="h-4 w-4 text-primary" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{doc.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </TooltipProvider>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Suivi de commande</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left column: Search + User orders list */}
          <div className="space-y-6">
            {/* Search form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rechercher une commande</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col gap-3">
                  <Input
                    type="text"
                    placeholder="Numéro de commande (ex: VB-ABC123)"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                  />
                  <Button type="submit" disabled={loading}>
                    <Search className="h-4 w-4 mr-2" />
                    {loading ? "Recherche..." : "Rechercher"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* User's orders list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Mes commandes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingUserOrders ? (
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
                          <Badge className={`${statusConfig[o.status as OrderStatus].color} text-xs`}>
                            {statusConfig[o.status as OrderStatus].label}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatShortDate(o.created_at)}</span>
                          <span>{formatPriceHT(o.total_ht)}</span>
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
            {!searched && !order && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Recherchez une commande
                  </h2>
                  <p className="text-muted-foreground text-center">
                    Entrez un numéro de commande ou sélectionnez une commande dans la liste
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
                      <Badge className={`${statusConfig[order.status].color} flex items-center gap-1 self-start`}>
                        {statusConfig[order.status].icon}
                        {statusConfig[order.status].label}
                      </Badge>
                    </div>

                    {/* Progress bar */}
                    {renderProgressBar(order.status)}
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
                                  {item.variant_title && (
                                    <p className="text-sm text-muted-foreground">
                                      {item.variant_title}
                                    </p>
                                  )}
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

                    {/* Totals */}
                    <div className="border-t mt-4 pt-4">
                      <div className="flex justify-end">
                        <div className="space-y-1 text-right">
                          <p className="text-sm text-muted-foreground">
                            Total HT: <span className="font-semibold text-foreground">{formatPriceHT(order.total_ht)}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total TTC: <span className="text-foreground">{formatPriceTTC(order.total_ttc)}</span>
                          </p>
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
    </div>
  );
};

export default OrderTrackingPage;