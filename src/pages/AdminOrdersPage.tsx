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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle, 
  Package, 
  Truck, 
  Home, 
  XCircle,
  RefreshCw,
  Edit,
  AlertTriangle,
  Send,
  Trash2,
  Archive
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type OrderStatus = 'pending' | 'paid' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

const ORDER_STATUSES: OrderStatus[] = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

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
  user_email: string | null;
}

const statusConfig: Record<OrderStatus, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "En attente", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: Clock },
  paid: { label: "Payée", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: CheckCircle },
  confirmed: { label: "Confirmée fournisseur", color: "bg-blue-100 text-blue-800 border-blue-300", icon: CheckCircle },
  processing: { label: "En préparation", color: "bg-purple-100 text-purple-800 border-purple-300", icon: Package },
  shipped: { label: "Expédiée", color: "bg-indigo-100 text-indigo-800 border-indigo-300", icon: Truck },
  delivered: { label: "Livrée", color: "bg-green-100 text-green-800 border-green-300", icon: Home },
  cancelled: { label: "Annulée", color: "bg-red-100 text-red-800 border-red-300", icon: XCircle },
};

const statusOrder: OrderStatus[] = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered'];

interface ConfirmationState {
  open: boolean;
  order: Order | null;
  newStatus: OrderStatus | null;
}

interface CancelConfirmationState {
  step: 'first' | 'second' | null;
  order: Order | null;
}

interface ValidateConfirmationState {
  step: 'first' | 'second' | null;
  order: Order | null;
}

interface BulkActionState {
  step: 'first' | 'second' | null;
  action: 'delete' | 'archive' | null;
}

const AdminOrdersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState<OrderStatus>('pending');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionState>({
    step: null,
    action: null,
  });
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    open: false,
    order: null,
    newStatus: null,
  });
  const [cancelConfirmation, setCancelConfirmation] = useState<CancelConfirmationState>({
    step: null,
    order: null,
  });
  const [validateConfirmation, setValidateConfirmation] = useState<ValidateConfirmationState>({
    step: null,
    order: null,
  });

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
      setConfirmation({ open: false, order: null, newStatus: null });
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
    setEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!selectedOrder) return;
    
    // Prevent any changes to cancelled orders
    if (selectedOrder.status === 'cancelled') {
      toast({
        title: "Action impossible",
        description: "Impossible de modifier une commande annulée.",
        variant: "destructive",
      });
      return;
    }

    // If status changed, show confirmation
    if (editStatus !== selectedOrder.status) {
      // Use two-step confirmation for cancellation
      if (editStatus === 'cancelled') {
        setCancelConfirmation({ step: 'first', order: selectedOrder });
        setEditDialogOpen(false);
        return;
      }
      
      // Use two-step confirmation for validation
      if (editStatus === 'confirmed') {
        setValidateConfirmation({ step: 'first', order: selectedOrder });
        setEditDialogOpen(false);
        return;
      }
      
      setConfirmation({
        open: true,
        order: selectedOrder,
        newStatus: editStatus,
      });
      setEditDialogOpen(false);
    } else {
      // No status change, nothing to do
      setEditDialogOpen(false);
    }
  };

  const confirmStatusChange = () => {
    if (!confirmation.order || !confirmation.newStatus) return;

    updateOrderMutation.mutate({
      order_id: confirmation.order.id,
      status: confirmation.newStatus,
    });
  };

const quickStatusUpdate = (order: Order, newStatus: OrderStatus) => {
    // Prevent any status change on cancelled orders
    if (order.status === 'cancelled') {
      toast({
        title: "Action impossible",
        description: "Impossible de modifier le statut d'une commande annulée.",
        variant: "destructive",
      });
      return;
    }
    
    // Use two-step confirmation for cancellation
    if (newStatus === 'cancelled') {
      setCancelConfirmation({ step: 'first', order });
      return;
    }
    
    // Use two-step confirmation for validation
    if (newStatus === 'confirmed') {
      setValidateConfirmation({ step: 'first', order });
      return;
    }
    
    setConfirmation({
      open: true,
      order,
      newStatus,
    });
  };

  const handleValidateFirstConfirm = () => {
    setValidateConfirmation((prev) => ({ ...prev, step: 'second' }));
  };

  const handleValidateSecondConfirm = () => {
    if (validateConfirmation.order) {
      updateOrderMutation.mutate({
        order_id: validateConfirmation.order.id,
        status: 'confirmed',
      });
      setValidateConfirmation({ step: null, order: null });
    }
  };

  const handleCancelFirstConfirm = () => {
    setCancelConfirmation((prev) => ({ ...prev, step: 'second' }));
  };

  const handleCancelSecondConfirm = () => {
    if (cancelConfirmation.order) {
      updateOrderMutation.mutate({
        order_id: cancelConfirmation.order.id,
        status: 'cancelled',
      });
      setCancelConfirmation({ step: null, order: null });
    }
  };

  // Simulate webhook mutation
  const simulateWebhookMutation = useMutation({
    mutationFn: async (order: Order) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const response = await supabase.functions.invoke('simulate-order-webhook', {
        body: { order_id: order.id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erreur lors de la simulation');
      }

      return response.data;
    },
    onSuccess: (data) => {
      // Download the PDF file if provided
      if (data.pdf_file?.content_base64) {
        const byteCharacters = atob(data.pdf_file.content_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { 
          type: 'application/pdf' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = data.pdf_file.filename || `commande_${data.order_number}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      toast({
        title: "Commande envoyée",
        description: `Commande ${data.order_number} envoyée au fournisseur`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk selection handlers
  const toggleOrderSelection = (orderId: string) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (orders && selectedOrderIds.size === orders.length) {
      setSelectedOrderIds(new Set());
    } else if (orders) {
      setSelectedOrderIds(new Set(orders.map((o) => o.id)));
    }
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', orderIds);

      if (error) throw error;
      return orderIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Commandes supprimées",
        description: `${count} commande(s) supprimée(s) définitivement.`,
      });
      setSelectedOrderIds(new Set());
      setBulkAction({ step: null, action: null });
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

  // Bulk archive mutation
  const bulkArchiveMutation = useMutation({
    mutationFn: async (orderIds: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { error } = await supabase
        .from('orders')
        .update({ is_archived: true })
        .in('id', orderIds);

      if (error) throw error;
      return orderIds.length;
    },
    onSuccess: (count) => {
      toast({
        title: "Commandes archivées",
        description: `${count} commande(s) archivée(s).`,
      });
      setSelectedOrderIds(new Set());
      setBulkAction({ step: null, action: null });
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

  const handleBulkActionClick = (action: 'delete' | 'archive') => {
    setBulkAction({ step: 'first', action });
  };

  const handleBulkFirstConfirm = () => {
    setBulkAction((prev) => ({ ...prev, step: 'second' }));
  };

  const handleBulkSecondConfirm = () => {
    const orderIds = Array.from(selectedOrderIds);
    if (bulkAction.action === 'delete') {
      bulkDeleteMutation.mutate(orderIds);
    } else if (bulkAction.action === 'archive') {
      bulkArchiveMutation.mutate(orderIds);
    }
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

  const isCancellation = confirmation.newStatus === 'cancelled';
  const isCancelledOrder = selectedOrder?.status === 'cancelled';

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
          <div className="flex items-center gap-2">
            {selectedOrderIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedOrderIds.size} sélectionnée(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkActionClick('archive')}
                  disabled={bulkArchiveMutation.isPending || bulkDeleteMutation.isPending}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archiver
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBulkActionClick('delete')}
                  disabled={bulkArchiveMutation.isPending || bulkDeleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
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
                    <TableHead className="w-12">
                      <Checkbox
                        checked={orders && orders.length > 0 && selectedOrderIds.size === orders.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Tout sélectionner"
                      />
                    </TableHead>
                    <TableHead>N° Commande</TableHead>
                    <TableHead>Client</TableHead>
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
                      <TableRow key={order.id} className={selectedOrderIds.has(order.id) ? "bg-muted/50" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrderIds.has(order.id)}
                            onCheckedChange={() => toggleOrderSelection(order.id)}
                            aria-label={`Sélectionner la commande ${order.order_number}`}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm">
                          {order.user_email || <span className="text-muted-foreground">-</span>}
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
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => simulateWebhookMutation.mutate(order)}
                              disabled={simulateWebhookMutation.isPending}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Envoyer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(order)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Modifier
                            </Button>
                          </div>
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
            {isCancelledOrder && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                <p className="text-sm text-destructive">
                  Cette commande est annulée. Le statut ne peut plus être modifié.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Statut</Label>
              <Select 
                value={editStatus} 
                onValueChange={(v) => setEditStatus(v as OrderStatus)}
                disabled={isCancelledOrder}
              >
                <SelectTrigger className={isCancelledOrder ? "opacity-50 cursor-not-allowed" : ""}>
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
              Fermer
            </Button>
            {!isCancelledOrder && (
              <Button 
                onClick={handleSave} 
                disabled={updateOrderMutation.isPending}
              >
                {updateOrderMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmation.open} onOpenChange={(open) => !open && setConfirmation({ open: false, order: null, newStatus: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isCancellation && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {isCancellation ? "Confirmer l'annulation" : "Confirmer le changement de statut"}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Commande <span className="font-mono font-medium">{confirmation.order?.order_number}</span>
                </p>
                <div className="flex items-center gap-2">
                  <Badge className={statusConfig[confirmation.order?.status || 'pending'].color}>
                    {statusConfig[confirmation.order?.status || 'pending'].label}
                  </Badge>
                  <span>→</span>
                  <Badge className={statusConfig[confirmation.newStatus || 'pending'].color}>
                    {statusConfig[confirmation.newStatus || 'pending'].label}
                  </Badge>
                </div>
                {isCancellation && (
                  <p className="text-destructive font-medium">
                    Cette action est irréversible.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOrderMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmStatusChange}
              disabled={updateOrderMutation.isPending}
              className={isCancellation ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {updateOrderMutation.isPending ? 'En cours...' : 'Confirmer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
</AlertDialog>

      {/* First Cancel Confirmation Dialog */}
      <AlertDialog 
        open={cancelConfirmation.step === 'first'} 
        onOpenChange={(open) => !open && setCancelConfirmation({ step: null, order: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Annuler la commande
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Commande <span className="font-mono font-medium">{cancelConfirmation.order?.order_number}</span>
                </p>
                <p className="text-muted-foreground">
                  Vous êtes sur le point d'annuler cette commande. Cette action est irréversible.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCancelFirstConfirm();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Cancel Confirmation Dialog */}
      <AlertDialog 
        open={cancelConfirmation.step === 'second'} 
        onOpenChange={(open) => !open && setCancelConfirmation({ step: null, order: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Confirmer l'annulation définitive
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Êtes-vous absolument certain de vouloir annuler la commande <span className="font-mono font-medium">{cancelConfirmation.order?.order_number}</span> ?
                </p>
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                  <p className="text-destructive font-medium text-sm">
                    ⚠️ Cette action est IRRÉVERSIBLE. Une fois annulée, la commande ne pourra plus être modifiée.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOrderMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCancelSecondConfirm();
              }}
              disabled={updateOrderMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {updateOrderMutation.isPending ? 'Annulation...' : 'Confirmer l\'annulation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* First Validate Confirmation Dialog */}
      <AlertDialog 
        open={validateConfirmation.step === 'first'} 
        onOpenChange={(open) => !open && setValidateConfirmation({ step: null, order: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Valider la commande
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Commande <span className="font-mono font-medium">{validateConfirmation.order?.order_number}</span>
                </p>
                <p className="text-muted-foreground">
                  Vous êtes sur le point de valider cette commande. La commande passera au statut "Confirmée".
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Retour</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleValidateFirstConfirm();
              }}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Validate Confirmation Dialog */}
      <AlertDialog 
        open={validateConfirmation.step === 'second'} 
        onOpenChange={(open) => !open && setValidateConfirmation({ step: null, order: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              Confirmer la validation
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Êtes-vous sûr de vouloir valider la commande <span className="font-mono font-medium">{validateConfirmation.order?.order_number}</span> ?
                </p>
                <p className="text-blue-600 font-medium">
                  Cette action confirmera la commande et notifiera le client.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updateOrderMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleValidateSecondConfirm();
              }}
              disabled={updateOrderMutation.isPending}
            >
              {updateOrderMutation.isPending ? 'Validation...' : 'Confirmer la validation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* First Bulk Action Confirmation Dialog */}
      <AlertDialog 
        open={bulkAction.step === 'first'} 
        onOpenChange={(open) => !open && setBulkAction({ step: null, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {bulkAction.action === 'delete' ? (
                <Trash2 className="h-5 w-5 text-destructive" />
              ) : (
                <Archive className="h-5 w-5 text-primary" />
              )}
              {bulkAction.action === 'delete' ? 'Supprimer les commandes' : 'Archiver les commandes'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Vous avez sélectionné <span className="font-medium">{selectedOrderIds.size}</span> commande(s).
                </p>
                <p className="text-muted-foreground">
                  {bulkAction.action === 'delete' 
                    ? 'Cette action supprimera définitivement les commandes sélectionnées. Cette action est irréversible.'
                    : 'Cette action archivera les commandes sélectionnées. Elles ne seront plus visibles dans la liste principale.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleBulkFirstConfirm();
              }}
              className={bulkAction.action === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Continuer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Second Bulk Action Confirmation Dialog */}
      <AlertDialog 
        open={bulkAction.step === 'second'} 
        onOpenChange={(open) => !open && setBulkAction({ step: null, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirmer l'action
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Êtes-vous sûr de vouloir {bulkAction.action === 'delete' ? 'supprimer définitivement' : 'archiver'}{' '}
                  <span className="font-medium">{selectedOrderIds.size}</span> commande(s) ?
                </p>
                {bulkAction.action === 'delete' && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-destructive font-medium text-sm">
                      ⚠️ Cette action est IRRÉVERSIBLE. Les commandes seront supprimées de la base de données.
                    </p>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleteMutation.isPending || bulkArchiveMutation.isPending}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBulkSecondConfirm();
              }}
              disabled={bulkDeleteMutation.isPending || bulkArchiveMutation.isPending}
              className={bulkAction.action === 'delete' ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {bulkDeleteMutation.isPending || bulkArchiveMutation.isPending 
                ? 'En cours...' 
                : bulkAction.action === 'delete' ? 'Supprimer définitivement' : 'Archiver'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
};

export default AdminOrdersPage;