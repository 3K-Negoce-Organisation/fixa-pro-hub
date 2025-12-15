import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  Home, 
  XCircle,
  RefreshCw,
  Edit
} from "lucide-react";
type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total_ht: number;
  total_ttc: number;
  tracking_number: string | null;
  carrier: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  confirmed: { label: "Confirmée", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle },
  processing: { label: "En préparation", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Package },
  shipped: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800 border-green-300", icon: Home },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const statusOrder: OrderStatus[] = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const AdminOrdersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [editTrackingNumber, setEditTrackingNumber] = useState('');
  const [editCarrier, setEditCarrier] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      setIsAdmin(!!roleData);
    };
    checkAdmin();
  }, []);

  // Fetch all orders
  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Order[];
    },
    enabled: isAdmin === true,
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, queryClient]);

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (params: { order_id: string; status?: OrderStatus; tracking_number?: string; carrier?: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('admin-update-order', {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la mise à jour');
      }

      return response.data;
    },
    onSuccess: () => {
      toast({
        title: "Commande mise à jour",
        description: "Les modifications ont été enregistrées.",
      });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openEditDialog = (order: Order) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditTrackingNumber(order.tracking_number || '');
    setEditCarrier(order.carrier || '');
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedOrder) return;

    updateOrderMutation.mutate({
      order_id: selectedOrder.id,
      status: editStatus,
      tracking_number: editTrackingNumber || undefined,
      carrier: editCarrier || undefined,
    });
  };

  const quickStatusUpdate = (order: Order, newStatus: OrderStatus) => {
    updateOrderMutation.mutate({
      order_id: order.id,
      status: newStatus,
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Accès refusé</h2>
              <p className="text-muted-foreground">
                Vous n'avez pas les droits administrateur pour accéder à cette page.
              </p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Administration des commandes</h1>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Liste des commandes ({orders?.length || 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Total HT</TableHead>
                    <TableHead>Suivi</TableHead>
                    <TableHead>Actions rapides</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders?.map((order) => {
                    const StatusIcon = statusConfig[order.status].icon;
                    const currentIndex = statusOrder.indexOf(order.status);
                    const nextStatus = currentIndex >= 0 && currentIndex < statusOrder.length - 1 
                      ? statusOrder[currentIndex + 1] 
                      : null;

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusConfig[order.status].color} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />
                            {statusConfig[order.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatPrice(order.total_ht)}
                        </TableCell>
                        <TableCell>
                          {order.tracking_number ? (
                            <span className="text-sm">
                              {order.carrier && <span className="text-muted-foreground">{order.carrier}: </span>}
                              <span className="font-mono">{order.tracking_number}</span>
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {nextStatus && order.status !== 'cancelled' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => quickStatusUpdate(order, nextStatus)}
                                disabled={updateOrderMutation.isPending}
                              >
                                → {statusConfig[nextStatus].label}
                              </Button>
                            )}
                            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive"
                                onClick={() => quickStatusUpdate(order, 'cancelled')}
                                disabled={updateOrderMutation.isPending}
                              >
                                Annuler
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(order)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {orders?.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune commande trouvée
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Modifier la commande {selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as OrderStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {statusConfig[status].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Transporteur</Label>
              <Select value={editCarrier} onValueChange={setEditCarrier}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un transporteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colissimo">Colissimo</SelectItem>
                  <SelectItem value="chronopost">Chronopost</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="mondial_relay">Mondial Relay</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Numéro de suivi</Label>
              <Input
                value={editTrackingNumber}
                onChange={(e) => setEditTrackingNumber(e.target.value)}
                placeholder="Ex: 1Z999AA10123456784"
              />
            </div>

            {selectedOrder && (
              <div className="pt-4 border-t text-sm text-muted-foreground space-y-1">
                <p>Adresse: {selectedOrder.shipping_address}</p>
                <p>{selectedOrder.shipping_postal_code} {selectedOrder.shipping_city}</p>
                <p>Total: {formatPrice(selectedOrder.total_ttc)} TTC</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default AdminOrdersPage;
