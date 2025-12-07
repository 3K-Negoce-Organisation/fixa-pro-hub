import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Package, Truck, CheckCircle, Clock, XCircle, Search, AlertCircle } from "lucide-react";

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

type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

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
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode; step: number }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" />, step: 1 },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" />, step: 2 },
  processing: { label: "En préparation", color: "bg-purple-100 text-purple-800", icon: <Package className="h-4 w-4" />, step: 3 },
  shipped: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800", icon: <Truck className="h-4 w-4" />, step: 4 },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" />, step: 5 },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" />, step: 0 },
};

const statusSteps = [
  { key: 'pending', label: 'En attente' },
  { key: 'confirmed', label: 'Confirmée' },
  { key: 'processing', label: 'Préparation' },
  { key: 'shipped', label: 'Expédiée' },
  { key: 'delivered', label: 'Livrée' },
];

const OrderTrackingPage = () => {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    const searchTerm = orderNumber.trim().toUpperCase();

    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("order_number", searchTerm)
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

    setOrder({
      ...orderData,
      status: orderData.status as OrderStatus,
      order_items: itemsData || [],
    });

    setLoading(false);
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

    return (
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
            
            return (
              <div key={step.key} className="flex flex-col items-center relative z-10">
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
                <span className={`mt-2 text-xs font-medium ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`}>
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
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Suivi de commande</h1>

        {/* Search form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Rechercher votre commande</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="flex gap-3">
              <Input
                type="text"
                placeholder="Entrez votre numéro de commande (ex: CMD-2024-001)"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Recherche..." : "Rechercher"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error state */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="flex items-center gap-3 py-6">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <p className="text-destructive">{error}</p>
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

        {/* Order found */}
        {order && (
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
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire HT</TableHead>
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
      </main>
      <Footer />
    </div>
  );
};

export default OrderTrackingPage;