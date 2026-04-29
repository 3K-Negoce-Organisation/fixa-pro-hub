import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Plus, 
  Edit, 
  Trash2, 
  RefreshCw, 
  XCircle,
  Package,
  Search,
  Loader2,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  Percent
} from "lucide-react";
import { ProductImageUpload } from "@/components/admin/ProductImageUpload";
import { ProductExcelImport } from "@/components/admin/ProductExcelImport";
import { BulkImageUpload } from "@/components/admin/BulkImageUpload";
import { Checkbox } from "@/components/ui/checkbox";
import type { Tables } from "@/integrations/supabase/types";

type Product = Tables<"products">;

interface ProductImage {
  url: string;
}

interface ProductFormData {
  title: string;
  handle: string;
  description: string;
  price_ht: number;
  price_ttc: number;
  category_id: string;
  stock: number;
  is_active: boolean;
  is_promo: boolean;
  promo_discount_percent: number;
  promo_price_ht: number;
  promo_end_date: string;
  promo_gift_product_id: string;
  promo_gift_quantity: number;
  promo_label: string;
  tags: string;
  images: ProductImage[];
  // New fields from Excel
  code_alsafix: string;
  designation_fr: string;
  box_quantity: number;
  purchase_price_ht: number;
  box_weight: number;
  diameter_mm: number;
  length_mm: number;
  usage: string;
  material: string;
  drive_type: string;
  thickness_to_fix_mm: number;
  thread_length_mm: number;
  head_diameter_mm: number;
}

const emptyFormData: ProductFormData = {
  title: "",
  handle: "",
  description: "",
  price_ht: 0,
  price_ttc: 0,
  category_id: "",
  stock: 0,
  is_active: true,
  is_promo: false,
  promo_discount_percent: 0,
  promo_price_ht: 0,
  promo_end_date: "",
  promo_gift_product_id: "",
  promo_gift_quantity: 1,
  promo_label: "",
  tags: "",
  images: [],
  code_alsafix: "",
  designation_fr: "",
  box_quantity: 0,
  purchase_price_ht: 0,
  box_weight: 0,
  diameter_mm: 0,
  length_mm: 0,
  usage: "",
  material: "",
  drive_type: "",
  thickness_to_fix_mm: 0,
  thread_length_mm: 0,
  head_diameter_mm: 0,
};

const AdminProductsPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [bulkStatusAction, setBulkStatusAction] = useState<"activate" | "deactivate">("activate");
  const [bulkPromoDialogOpen, setBulkPromoDialogOpen] = useState(false);
  const [promoDiscount, setPromoDiscount] = useState<number>(10);
  const [formErrors, setFormErrors] = useState<{ title?: boolean; price_ht?: boolean; price_ttc?: boolean }>({});

  // Check admin status
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      setIsAdmin(!!roleData);
    };
    checkAdmin();
  }, []);

  // Fetch categories for the dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all products (including inactive for admin), with joined category
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, slug)')
        .order('title');
      
      if (error) throw error;
      return data as (Product & { categories: { id: string; name: string; slug: string } | null })[];
    },
    enabled: isAdmin === true,
  });

  // Filter products by search
  const filteredProducts = products?.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p as any).categories?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code_alsafix?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const computePromoPriceHT = (data: ProductFormData): number | null => {
    if (!data.is_promo) return null;
    if (data.promo_discount_percent > 0 && data.price_ht > 0) {
      return Math.round(data.price_ht * (1 - data.promo_discount_percent / 100) * 100) / 100;
    }
    if (data.promo_price_ht > 0) return data.promo_price_ht;
    return null;
  };

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const computedPromoPriceHT = computePromoPriceHT(data);
      const { error } = await supabase
        .from('products')
        .insert({
          title: data.title,
          handle: data.handle || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: data.description,
          price_ht: data.price_ht,
          price_ttc: data.price_ttc,
          category_id: data.category_id || null,
          stock: data.stock,
          is_active: data.is_active,
          is_promo: data.is_promo,
          promo_discount_percent: data.is_promo && data.promo_discount_percent > 0 ? data.promo_discount_percent : null,
          promo_price_ht: computedPromoPriceHT,
          promo_end_date: data.is_promo && data.promo_end_date ? new Date(data.promo_end_date).toISOString() : null,
          promo_gift_product_id: data.is_promo && data.promo_gift_product_id ? data.promo_gift_product_id : null,
          promo_gift_quantity: data.is_promo && data.promo_gift_product_id ? Math.max(1, data.promo_gift_quantity || 1) : null,
          promo_label: data.is_promo && data.promo_label.trim() ? data.promo_label.trim() : null,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
          images: JSON.parse(JSON.stringify(data.images)),
          code_alsafix: data.code_alsafix || null,
          designation_fr: data.designation_fr || null,
          box_quantity: data.box_quantity || null,
          purchase_price_ht: data.purchase_price_ht || null,
          box_weight: data.box_weight || null,
          diameter_mm: data.diameter_mm || null,
          length_mm: data.length_mm || null,
          usage: data.usage || null,
          material: data.material || null,
          drive_type: data.drive_type || null,
          thickness_to_fix_mm: data.thickness_to_fix_mm || null,
          thread_length_mm: data.thread_length_mm || null,
          head_diameter_mm: data.head_diameter_mm || null,
        } as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Produit créé", description: "Le produit a été ajouté avec succès." });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const computedPromoPriceHT = computePromoPriceHT(data);
      const { error } = await supabase
        .from('products')
        .update({
          title: data.title,
          handle: data.handle,
          description: data.description,
          price_ht: data.price_ht,
          price_ttc: data.price_ttc,
          category_id: data.category_id || null,
          stock: data.stock,
          is_active: data.is_active,
          is_promo: data.is_promo,
          promo_discount_percent: data.is_promo && data.promo_discount_percent > 0 ? data.promo_discount_percent : null,
          promo_price_ht: computedPromoPriceHT,
          promo_end_date: data.is_promo && data.promo_end_date ? new Date(data.promo_end_date).toISOString() : null,
          promo_gift_product_id: data.is_promo && data.promo_gift_product_id ? data.promo_gift_product_id : null,
          promo_gift_quantity: data.is_promo && data.promo_gift_product_id ? Math.max(1, data.promo_gift_quantity || 1) : null,
          promo_label: data.is_promo && data.promo_label.trim() ? data.promo_label.trim() : null,
          tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
          images: JSON.parse(JSON.stringify(data.images)),
          code_alsafix: data.code_alsafix || null,
          designation_fr: data.designation_fr || null,
          box_quantity: data.box_quantity || null,
          purchase_price_ht: data.purchase_price_ht || null,
          box_weight: data.box_weight || null,
          diameter_mm: data.diameter_mm || null,
          length_mm: data.length_mm || null,
          usage: data.usage || null,
          material: data.material || null,
          drive_type: data.drive_type || null,
          thickness_to_fix_mm: data.thickness_to_fix_mm || null,
          thread_length_mm: data.thread_length_mm || null,
          head_diameter_mm: data.head_diameter_mm || null,
        } as any)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Produit modifié", description: "Les modifications ont été enregistrées." });
      setDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Produit supprimé", description: "Le produit a été supprimé." });
      setDeleteDialogOpen(false);
      setProductToDelete(null);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Produits supprimés", description: `${selectedIds.size} produit(s) supprimé(s).` });
      setBulkDeleteDialogOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Bulk status update mutation
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, is_active }: { ids: string[]; is_active: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active })
        .in('id', ids);
      
      if (error) throw error;
    },
    onSuccess: () => {
      const action = bulkStatusAction === "activate" ? "activé(s)" : "désactivé(s)";
      toast({ title: "Statut modifié", description: `${selectedIds.size} produit(s) ${action}.` });
      setBulkStatusDialogOpen(false);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Bulk promo mutation
  const bulkPromoMutation = useMutation({
    mutationFn: async ({ ids, discount }: { ids: string[]; discount: number }) => {
      // Get current products to calculate promo prices
      const { data: productsToUpdate, error: fetchError } = await supabase
        .from('products')
        .select('id, price_ht')
        .in('id', ids);
      
      if (fetchError) throw fetchError;
      
      // Update each product with calculated promo price
      for (const product of productsToUpdate || []) {
        const promoPrice = Math.round(product.price_ht * (1 - discount / 100) * 100) / 100;
        const { error } = await supabase
          .from('products')
          .update({ 
            is_promo: true, 
            promo_discount_percent: discount,
            promo_price_ht: promoPrice 
          })
          .eq('id', product.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Promo appliquée", description: `${selectedIds.size} produit(s) mis en promo avec -${promoDiscount}%.` });
      setBulkPromoDialogOpen(false);
      setSelectedIds(new Set());
      setPromoDiscount(10);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: Error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const handleBulkStatusChange = () => {
    bulkStatusMutation.mutate({
      ids: Array.from(selectedIds),
      is_active: bulkStatusAction === "activate",
    });
  };

  const openBulkStatusDialog = (action: "activate" | "deactivate") => {
    setBulkStatusAction(action);
    setBulkStatusDialogOpen(true);
  };

  const handleBulkPromo = () => {
    bulkPromoMutation.mutate({
      ids: Array.from(selectedIds),
      discount: promoDiscount,
    });
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingProduct(null);
    setFormErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    let productImages: ProductImage[] = [];
    if (Array.isArray(product.images)) {
      productImages = product.images.map((img: unknown) => {
        if (typeof img === 'object' && img !== null && 'url' in img) {
          return { url: String((img as { url: unknown }).url) };
        }
        return { url: '' };
      }).filter(img => img.url);
    }
    setFormData({
      title: product.title,
      handle: product.handle,
      description: product.description || "",
      price_ht: product.price_ht,
      price_ttc: product.price_ttc,
      category_id: product.category_id || "",
      stock: product.stock || 0,
      is_active: product.is_active ?? true,
      is_promo: product.is_promo ?? false,
      promo_discount_percent: (product as any).promo_discount_percent || 0,
      promo_price_ht: product.promo_price_ht || 0,
      promo_end_date: (product as any).promo_end_date ? new Date((product as any).promo_end_date).toISOString().slice(0, 16) : "",
      promo_gift_product_id: (product as any).promo_gift_product_id || "",
      promo_gift_quantity: (product as any).promo_gift_quantity || 1,
      promo_label: (product as any).promo_label || "",
      tags: product.tags?.join(', ') || "",
      images: productImages,
      code_alsafix: product.code_alsafix || "",
      designation_fr: product.designation_fr || "",
      box_quantity: product.box_quantity || 0,
      purchase_price_ht: product.purchase_price_ht || 0,
      box_weight: product.box_weight || 0,
      diameter_mm: product.diameter_mm || 0,
      length_mm: product.length_mm || 0,
      usage: product.usage || "",
      material: product.material || "",
      drive_type: product.drive_type || "",
      thickness_to_fix_mm: product.thickness_to_fix_mm || 0,
      thread_length_mm: product.thread_length_mm || 0,
      head_diameter_mm: product.head_diameter_mm || 0,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    const errors: { title?: boolean; price_ht?: boolean; price_ttc?: boolean } = {};
    if (!formData.title.trim()) errors.title = true;
    if (formData.price_ht <= 0) errors.price_ht = true;
    if (formData.price_ttc <= 0) errors.price_ttc = true;

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = () => {
    if (productToDelete) {
      deleteMutation.mutate(productToDelete.id);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
  };

  // Auto-calculate TTC from HT
  const handlePriceHTChange = (value: number) => {
    setFormData({
      ...formData,
      price_ht: value,
      price_ttc: Math.round(value * 1.2 * 100) / 100,
    });
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Gestion des produits
          </h1>
          <div className="flex items-center gap-2">
            <ProductExcelImport onImportComplete={() => refetch()} />
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un produit
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, handle, catégorie ou code ALSAFIX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Catalogue ({filteredProducts.length} produits)</CardTitle>
                {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {selectedIds.size} sélectionné(s)
                    </span>
                    <BulkImageUpload 
                      selectedProductIds={Array.from(selectedIds)} 
                      onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
                        setSelectedIds(new Set());
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkStatusDialog("activate")}
                    >
                      <Power className="h-4 w-4 mr-1" />
                      Activer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openBulkStatusDialog("deactivate")}
                    >
                      <PowerOff className="h-4 w-4 mr-1" />
                      Désactiver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      onClick={() => setBulkPromoDialogOpen(true)}
                    >
                      <Percent className="h-4 w-4 mr-1" />
                      Promo
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setBulkDeleteDialogOpen(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Tout sélectionner"
                        />
                      </TableHead>
                      <TableHead className="w-16">Image</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Prix HT</TableHead>
                      <TableHead>Prix TTC</TableHead>
                    <TableHead>Qté/boite</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Promo</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                          Aucun produit trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => {
                        const firstImage = Array.isArray(product.images) && product.images.length > 0
                          ? (typeof product.images[0] === 'object' && product.images[0] !== null && 'url' in product.images[0]
                            ? (product.images[0] as { url: string }).url
                            : null)
                          : null;
                        return (
                        <TableRow key={product.id} className={selectedIds.has(product.id) ? "bg-muted/50" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(product.id)}
                              onCheckedChange={() => toggleSelect(product.id)}
                              aria-label={`Sélectionner ${product.title}`}
                            />
                          </TableCell>
                          <TableCell>
                            {firstImage ? (
                              <img 
                                src={firstImage} 
                                alt={product.title} 
                                className="w-12 h-12 object-contain rounded bg-muted"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {product.code_alsafix || "-"}
                          </TableCell>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {product.title}
                          </TableCell>
                          <TableCell className="max-w-[120px]">
                            {(product as any).categories?.name ? (
                              <Badge variant="secondary" className="truncate max-w-full text-xs font-normal">
                                {(product as any).categories.name}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{formatPrice(product.price_ht)}</TableCell>
                          <TableCell>{formatPrice(product.price_ttc)}</TableCell>
                          <TableCell>{product.box_quantity || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock && product.stock > 0 ? "default" : "destructive"}>
                              {product.stock || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {product.is_promo ? (
                              <div className="space-y-1">
                                {(product as any).promo_discount_percent ? (
                                  <Badge className="bg-destructive text-destructive-foreground">
                                    <Percent className="h-3 w-3 mr-1" />-{Math.round((product as any).promo_discount_percent)}%
                                  </Badge>
                                ) : product.promo_price_ht ? (
                                  <Badge className="bg-destructive text-destructive-foreground">
                                    <Percent className="h-3 w-3 mr-1" />
                                    {formatPrice(product.promo_price_ht)}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-destructive text-destructive-foreground">Promo</Badge>
                                )}
                                {(product as any).promo_gift_product_id && (
                                  <p className="text-xs text-muted-foreground">
                                    + {(product as any).promo_gift_quantity || 1} offert
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={product.is_active ? "outline" : "secondary"}
                              className={product.is_active ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400" : ""}
                            >
                              {product.is_active ? "Actif" : "Inactif"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(product)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(product)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <Footer />

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Informations générales</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code_alsafix">Code ALSAFIX</Label>
                  <Input
                    id="code_alsafix"
                    value={formData.code_alsafix}
                    onChange={(e) => setFormData({ ...formData, code_alsafix: e.target.value })}
                    placeholder="QS5040TX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="designation_fr">Désignation FR</Label>
                  <Input
                    id="designation_fr"
                    value={formData.designation_fr}
                    onChange={(e) => setFormData({ ...formData, designation_fr: e.target.value })}
                    placeholder="Vis QS 5,0 x 40 inox TX25"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className={formErrors.title ? "text-destructive" : ""}>Titre *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (formErrors.title) setFormErrors({ ...formErrors, title: false });
                    }}
                    placeholder="Vis terrasse QS 5 x 40"
                    className={formErrors.title ? "border-destructive" : ""}
                  />
                  {formErrors.title && <p className="text-sm text-destructive">Champ obligatoire</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="handle">Handle (URL)</Label>
                  <Input
                    id="handle"
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                    placeholder="vis-terrasse-qs-5-x-40"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du produit..."
                  rows={4}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category_id">Catégorie</Label>
                  <UiSelect
                    value={formData.category_id || ""}
                    onValueChange={(val) => setFormData({ ...formData, category_id: val })}
                  >
                    <UiSelectTrigger id="category_id">
                      <UiSelectValue placeholder="Choisir une catégorie" />
                    </UiSelectTrigger>
                    <UiSelectContent>
                      {categories.map((cat) => (
                        <UiSelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </UiSelectItem>
                      ))}
                    </UiSelectContent>
                  </UiSelect>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (séparés par des virgules)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Torx, Inox A2, 5x50"
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Prix et quantités</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_ht" className={formErrors.price_ht ? "text-destructive" : ""}>Prix vente HT * (€)</Label>
                  <Input
                    id="price_ht"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_ht}
                    onChange={(e) => {
                      handlePriceHTChange(parseFloat(e.target.value) || 0);
                      if (formErrors.price_ht) setFormErrors({ ...formErrors, price_ht: false });
                    }}
                    className={formErrors.price_ht ? "border-destructive" : ""}
                  />
                  {formErrors.price_ht && <p className="text-sm text-destructive">Prix requis</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_ttc" className={formErrors.price_ttc ? "text-destructive" : ""}>Prix vente TTC * (€)</Label>
                  <Input
                    id="price_ttc"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price_ttc}
                    onChange={(e) => {
                      setFormData({ ...formData, price_ttc: parseFloat(e.target.value) || 0 });
                      if (formErrors.price_ttc) setFormErrors({ ...formErrors, price_ttc: false });
                    }}
                    className={formErrors.price_ttc ? "border-destructive" : ""}
                  />
                  {formErrors.price_ttc && <p className="text-sm text-destructive">Prix requis</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase_price_ht">Prix achat HT (€)</Label>
                  <Input
                    id="purchase_price_ht"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchase_price_ht}
                    onChange={(e) => setFormData({ ...formData, purchase_price_ht: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box_quantity">Quantité par boite</Label>
                  <Input
                    id="box_quantity"
                    type="number"
                    min="0"
                    value={formData.box_quantity}
                    onChange={(e) => setFormData({ ...formData, box_quantity: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock (boites)</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box_weight">Poids boite (kg)</Label>
                  <Input
                    id="box_weight"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.box_weight}
                    onChange={(e) => setFormData({ ...formData, box_weight: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Promotion */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2 flex items-center gap-2">
                <Percent className="h-5 w-5 text-destructive" />
                Promotion
              </h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_promo"
                  checked={formData.is_promo}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_promo: checked })}
                />
                <Label htmlFor="is_promo">Produit en promotion</Label>
              </div>
              {formData.is_promo && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promo_discount_percent">Réduction (%)</Label>
                      <Input
                        id="promo_discount_percent"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.promo_discount_percent}
                        onChange={(e) => setFormData({ ...formData, promo_discount_percent: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                        placeholder="Ex: 15"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo_price_ht">Prix promo HT (€) (fallback)</Label>
                      <Input
                        id="promo_price_ht"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.promo_price_ht}
                        onChange={(e) => setFormData({ ...formData, promo_price_ht: parseFloat(e.target.value) || 0 })}
                        placeholder="Utilisé si % = 0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prix promo TTC (calculé)</Label>
                      <Input
                        type="text"
                        value={formatPrice(
                          Math.round(
                            ((formData.promo_discount_percent > 0
                              ? formData.price_ht * (1 - formData.promo_discount_percent / 100)
                              : formData.promo_price_ht) * 1.2) * 100
                          ) / 100
                        )}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="promo_label">Libellé promo</Label>
                      <Input
                        id="promo_label"
                        value={formData.promo_label}
                        onChange={(e) => setFormData({ ...formData, promo_label: e.target.value })}
                        placeholder="Ex: Offre printemps"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo_end_date">Date de fin de promotion</Label>
                      <Input
                        id="promo_end_date"
                        type="datetime-local"
                        value={formData.promo_end_date}
                        onChange={(e) => setFormData({ ...formData, promo_end_date: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Laisser vide pour une promo sans limite de temps
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Article offert (optionnel)</Label>
                      <UiSelect
                        value={formData.promo_gift_product_id || "__none__"}
                        onValueChange={(value) => setFormData({ ...formData, promo_gift_product_id: value === "__none__" ? "" : value })}
                      >
                        <UiSelectTrigger>
                          <UiSelectValue placeholder="Aucun article offert" />
                        </UiSelectTrigger>
                        <UiSelectContent>
                          <UiSelectItem value="__none__">Aucun</UiSelectItem>
                          {products?.filter((p) => p.id !== editingProduct?.id).map((p) => (
                            <UiSelectItem key={p.id} value={p.id}>
                              {p.title}
                            </UiSelectItem>
                          ))}
                        </UiSelectContent>
                      </UiSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promo_gift_quantity">Quantité offerte</Label>
                      <Input
                        id="promo_gift_quantity"
                        type="number"
                        min="1"
                        value={formData.promo_gift_quantity}
                        onChange={(e) => setFormData({ ...formData, promo_gift_quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        disabled={!formData.promo_gift_product_id}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Prix normal: {formatPrice(formData.price_ht)} HT
                    {formData.promo_discount_percent > 0 && (
                      <span className="ml-2 text-destructive font-medium">
                        (-{Math.round(formData.promo_discount_percent)}%)
                      </span>
                    )}
                    {formData.promo_gift_product_id && (
                      <span className="ml-2">
                        + {formData.promo_gift_quantity || 1} article(s) offert(s)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Technical Specifications */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Caractéristiques techniques</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="diameter_mm">Diamètre (mm)</Label>
                  <Input
                    id="diameter_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.diameter_mm}
                    onChange={(e) => setFormData({ ...formData, diameter_mm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="length_mm">Longueur (mm)</Label>
                  <Input
                    id="length_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.length_mm}
                    onChange={(e) => setFormData({ ...formData, length_mm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="head_diameter_mm">Diamètre tête (mm)</Label>
                  <Input
                    id="head_diameter_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.head_diameter_mm}
                    onChange={(e) => setFormData({ ...formData, head_diameter_mm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="thread_length_mm">Longueur filetage (mm)</Label>
                  <Input
                    id="thread_length_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.thread_length_mm}
                    onChange={(e) => setFormData({ ...formData, thread_length_mm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="thickness_to_fix_mm">Épaisseur à fixer (mm)</Label>
                  <Input
                    id="thickness_to_fix_mm"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.thickness_to_fix_mm}
                    onChange={(e) => setFormData({ ...formData, thickness_to_fix_mm: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage">Utilisation</Label>
                  <Input
                    id="usage"
                    value={formData.usage}
                    onChange={(e) => setFormData({ ...formData, usage: e.target.value })}
                    placeholder="extérieur"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="material">Matière</Label>
                  <Input
                    id="material"
                    value={formData.material}
                    onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                    placeholder="Inox"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drive_type">Empreinte</Label>
                  <Input
                    id="drive_type"
                    value={formData.drive_type}
                    onChange={(e) => setFormData({ ...formData, drive_type: e.target.value })}
                    placeholder="TX 25"
                  />
                </div>
              </div>
            </div>

            {/* Images */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">Images</h3>
              <ProductImageUpload
                images={formData.images}
                onImagesChange={(images) => setFormData({ ...formData, images })}
              />
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2 pt-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="is_active">Produit actif (visible sur le site)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingProduct ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer "{productToDelete?.title}" ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {selectedIds.size} produit(s) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer ces {selectedIds.size} produit(s) ? 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Status Change Confirmation Dialog */}
      <AlertDialog open={bulkStatusDialogOpen} onOpenChange={setBulkStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkStatusAction === "activate" ? "Activer" : "Désactiver"} {selectedIds.size} produit(s) ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkStatusAction === "activate" 
                ? `Les ${selectedIds.size} produit(s) sélectionné(s) seront visibles sur le site.`
                : `Les ${selectedIds.size} produit(s) sélectionné(s) ne seront plus visibles sur le site.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusChange}>
              {bulkStatusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                bulkStatusAction === "activate" ? "Activer" : "Désactiver"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Promo Dialog */}
      <Dialog open={bulkPromoDialogOpen} onOpenChange={setBulkPromoDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-orange-500" />
              Mettre en promotion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {selectedIds.size} produit(s) sélectionné(s). Le prix promo sera calculé automatiquement.
            </p>
            <div className="space-y-2">
              <Label htmlFor="discount">Réduction (%)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="discount"
                  type="number"
                  min="1"
                  max="99"
                  value={promoDiscount}
                  onChange={(e) => setPromoDiscount(Math.min(99, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-24"
                />
                <span className="text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Le prix promo HT sera calculé : Prix HT × (1 - {promoDiscount}%)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPromoDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleBulkPromo}
              disabled={bulkPromoMutation.isPending || promoDiscount < 1 || promoDiscount > 99}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {bulkPromoMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Percent className="h-4 w-4 mr-2" />
              )}
              Appliquer -{promoDiscount}%
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProductsPage;
