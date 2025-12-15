import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Heart, ChevronRight, Truck, Shield, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { shopifyFetch, PRODUCT_BY_HANDLE_QUERY, formatPriceHT, formatPriceTTC } from "@/lib/shopify";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";

interface ShopifyProductDetail {
  productByHandle: {
    id: string;
    title: string;
    handle: string;
    description: string;
    descriptionHtml: string;
    productType: string;
    tags: string[];
    priceRange: {
      minVariantPrice: {
        amount: string;
        currencyCode: string;
      };
    };
    images: {
      edges: Array<{
        node: {
          url: string;
          altText: string | null;
        };
      }>;
    };
    variants: {
      edges: Array<{
        node: {
          id: string;
          title: string;
          price: {
            amount: string;
            currencyCode: string;
          };
          availableForSale: boolean;
          quantityAvailable: number;
        };
      }>;
    };
  } | null;
}

const ProductDetailPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => shopifyFetch<ShopifyProductDetail>(PRODUCT_BY_HANDLE_QUERY, { handle }),
    enabled: !!handle,
  });

  const product = data?.productByHandle;
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");

  // Set default variant when product loads
  const variants = product?.variants.edges.map(e => ({
    id: e.node.id,
    title: e.node.title,
    priceHT: parseFloat(e.node.price.amount),
    available: e.node.availableForSale,
    quantity: e.node.quantityAvailable,
  })) || [];

  const currentVariant = variants.find(v => v.id === selectedVariantId) || variants[0];

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Produit non trouvé</h1>
          <p className="text-muted-foreground mb-6">
            Le produit que vous recherchez n'existe pas ou a été supprimé.
          </p>
          <Button asChild>
            <Link to="/produits">Retour aux produits</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  const productImage = product.images.edges[0]?.node.url || "/placeholder.svg";

  const handleAddToCart = () => {
    if (!currentVariant) return;
    addItem(
      {
        id: product.id,
        variantId: currentVariant.id,
        handle: product.handle,
        title: product.title,
        variantTitle: currentVariant.title,
        priceHT: currentVariant.priceHT,
        image: productImage,
      },
      quantity
    );
    toast.success("Produit ajouté au panier", {
      description: `${product.title} - ${currentVariant.title} (x${quantity})`,
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <Link to="/" className="hover:text-foreground">
              Accueil
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/produits" className="hover:text-foreground">
              Produits
            </Link>
            <ChevronRight className="h-4 w-4" />
            {product.productType && (
              <>
                <Link
                  to={`/produits?cat=${product.productType.toLowerCase().replace(" ", "-")}`}
                  className="hover:text-foreground"
                >
                  {product.productType}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
            <span className="text-foreground truncate max-w-xs">{product.title}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Product Images */}
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8">
                <img
                  src={productImage}
                  alt={product.title}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Product Info */}
            <div className="space-y-6">
              {/* Title & Badge */}
              <div>
                {product.productType && (
                  <Badge variant="secondary" className="mb-2">
                    {product.productType}
                  </Badge>
                )}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  {product.title}
                </h1>
                <p className="text-muted-foreground">{product.description}</p>
              </div>

              {/* Stock Status */}
              {currentVariant && (
                <div>
                  {currentVariant.available ? (
                    <span className="stock-badge stock-available">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                      En stock ({currentVariant.quantity} disponibles)
                    </span>
                  ) : (
                    <span className="stock-badge stock-out">
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                      Rupture de stock
                    </span>
                  )}
                </div>
              )}

              {/* Variant Selection */}
              {variants.length > 1 && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">
                    Conditionnement
                  </label>
                  <Select 
                    value={selectedVariantId || currentVariant?.id} 
                    onValueChange={setSelectedVariantId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.title} - {formatPriceHT(variant.priceHT)} HT
                          {!variant.available && " (Rupture)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Price */}
              {currentVariant && (
                <div className="bg-secondary p-4 rounded-lg">
                  <div className="flex items-baseline gap-3 mb-1">
                    <span className="text-3xl font-bold text-foreground">
                      {formatPriceHT(currentVariant.priceHT)}
                    </span>
                    <span className="text-lg font-semibold text-primary">HT</span>
                  </div>
                  <p className="text-muted-foreground">
                    {formatPriceTTC(currentVariant.priceHT)} TTC
                  </p>
                </div>
              )}

              {/* Add to Cart */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Qté :</label>
                  <Input
                    type="number"
                    min={1}
                    max={currentVariant?.quantity || 1}
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-20"
                    disabled={!currentVariant?.available}
                  />
                </div>
                <Button
                  className="btn-cart flex-1"
                  size="lg"
                  onClick={handleAddToCart}
                  disabled={!currentVariant?.available}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Ajouter au panier
                </Button>
                <Button variant="outline" size="lg">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              {/* Quick benefits */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="flex flex-col items-center text-center gap-1">
                  <Truck className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Livraison 24/48h
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Qualité garantie
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-1">
                  <RotateCcw className="h-5 w-5 text-primary" />
                  <span className="text-xs text-muted-foreground">
                    Retour 30 jours
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Technical specifications from tags */}
          {product.tags.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-bold mb-4">Caractéristiques</h2>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;