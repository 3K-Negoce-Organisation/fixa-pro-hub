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
  PowerOff
} from "lucide-react";
import { ProductImageUpload } from "@/components/admin/ProductImageUpload";
import { ProductExcelImport } from "@/components/admin/ProductExcelImport";
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
  category: string;
  stock: number;
  is_active: boolean;
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
  category: "",
  stock: 0,
  is_active: true,
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

  // Fetch all products (including inactive for admin)
  const { data: products, isLoading, refetch } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('title');
      
      if (error) throw error;
      return data as Product[];
    },
    enabled: isAdmin === true,
  });

  // Filter products by search
  const filteredProducts = products?.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.code_alsafix?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { error } = await supabase
        .from('products')
        .insert({
          title: data.title,
          handle: data.handle || data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          description: data.description,
          price_ht: data.price_ht,
          price_ttc: data.price_ttc,
          category: data.category || null,
          stock: data.stock,
          is_active: data.is_active,
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
        });
      
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
      const { error } = await supabase
        .from('products')
        .update({
          title: data.title,
          handle: data.handle,
          description: data.description,
          price_ht: data.price_ht,
          price_ttc: data.price_ttc,
          category: data.category || null,
          stock: data.stock,
          is_active: data.is_active,
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
        })
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
      category: product.category || "",
      stock: product.stock || 0,
      is_active: product.is_active ?? true,
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
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                          <TableCell>{product.category || "-"}</TableCell>
                          <TableCell>{formatPrice(product.price_ht)}</TableCell>
                          <TableCell>{formatPrice(product.price_ttc)}</TableCell>
                          <TableCell>{product.box_quantity || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={product.stock && product.stock > 0 ? "default" : "destructive"}>
                              {product.stock || 0}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={product.is_active ? "default" : "secondary"}>
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
                  <Label htmlFor="category">Catégorie</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Vis terrasse"
                  />
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
    </div>
  );
};

export default AdminProductsPage;
