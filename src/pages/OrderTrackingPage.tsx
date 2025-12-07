import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Truck, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";

const TVA_RATE = 0.20;

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

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800", icon: <Clock className="h-4 w-4" /> },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-800", icon: <CheckCircle className="h-4 w-4" /> },
  processing: { label: "En préparation", color: "bg-purple-100 text-purple-800", icon: <Package className="h-4 w-4" /> },
  shipped: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800", icon: <Truck className="h-4 w-4" /> },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800", icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800", icon: <XCircle className="h-4 w-4" /> },
};

const OrderTrackingPage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      } else {
        loadOrders();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadOrders = async () => {
    setLoading(true);
    const { data: ordersData, error: ordersError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Error loading orders:", ordersError);
      setLoading(false);
      return;
    }

    if (ordersData && ordersData.length > 0) {
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", ordersData.map((o) => o.id));

      if (itemsError) {
        console.error("Error loading order items:", itemsError);
      }

      const ordersWithItems: Order[] = ordersData.map((order) => ({
        ...order,
        status: order.status as OrderStatus,
        order_items: (itemsData || []).filter((item) => item.order_id === order.id),
      }));

      setOrders(ordersWithItems);
    } else {
      setOrders([]);
    }

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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">Suivi de commandes</h1>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Aucune commande
              </h2>
              <p className="text-muted-foreground mb-6 text-center">
                Vous n'avez pas encore passé de commande.
              </p>
              <Button onClick={() => navigate("/produits")}>
                Découvrir nos produits
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {orders.map((order) => {
              const statusInfo = statusConfig[order.status];
              return (
                <AccordionItem
                  key={order.id}
                  value={order.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-left w-full pr-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">
                          #{order.order_number}
                        </span>
                        <Badge className={`${statusInfo.color} flex items-center gap-1`}>
                          {statusInfo.icon}
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </span>
                      <span className="font-semibold text-foreground ml-auto">
                        {formatPriceHT(order.total_ht)}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pt-4 space-y-6">
                      {/* Tracking info */}
                      {order.tracking_number && (
                        <div className="bg-muted/50 p-4 rounded-lg">
                          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                            <Truck className="h-4 w-4" />
                            Suivi de livraison
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Transporteur: <span className="text-foreground">{order.carrier || "Non spécifié"}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            N° de suivi: <span className="text-foreground font-mono">{order.tracking_number}</span>
                          </p>
                        </div>
                      )}

                      {/* Shipping address */}
                      {order.shipping_address && (
                        <div>
                          <h3 className="font-semibold text-foreground mb-2">Adresse de livraison</h3>
                          <p className="text-sm text-muted-foreground">
                            {order.shipping_address}<br />
                            {order.shipping_postal_code} {order.shipping_city}
                          </p>
                        </div>
                      )}

                      {/* Order items */}
                      <div>
                        <h3 className="font-semibold text-foreground mb-3">Articles commandés</h3>
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
                      </div>

                      {/* Order totals */}
                      <div className="border-t pt-4">
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
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default OrderTrackingPage;