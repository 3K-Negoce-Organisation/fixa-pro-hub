import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ShoppingCart, Heart, ChevronRight, Truck, Shield, RotateCcw, Loader2, Circle, Ruler, Wrench, Scale, Layers, Target, Settings2, Box, SlidersHorizontal } from "lucide-react";
import TorxIcon from "@/components/icons/TorxIcon";
import { CharacteristicPicto } from "@/components/products/CharacteristicPicto";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { fetchProductByHandle, getProductImage, parseVariants, formatPriceHT, formatPrice, type ProductVariant } from "@/lib/products";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

type CharacteristicIconRow = {
  characteristic_key: string;
  icon_url: string | null;
  site_id: string | null;
};

const ProductDetailPage = () => {
  const { handle } = useParams<{ handle: string }>();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { theme } = useTheme();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const siteId = theme.site_id || null;

  const { data: product, isLoading, error } = useQuery({
    queryKey: ["product", handle],
    queryFn: () => fetchProductByHandle(handle!),
    enabled: !!handle,
  });

  const { data: characteristicIcons = [] } = useQuery({
    queryKey: ["product-characteristic-icons", siteId],
    queryFn: async () => {
      let query = supabase
        .from("product_characteristic_icons" as any)
        .select("characteristic_key, icon_url, site_id");

      if (siteId) {
        query = query.eq("site_id", siteId);
      } else {
        query = query.is("site_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CharacteristicIconRow[];
    },
  });

  // Parse variants from product
  const variants: ProductVariant[] = product ? parseVariants(product) : [];
  const currentVariant = variants.find(v => v.id === selectedVariantId) || variants[0];
  const productImage = product ? getProductImage(product) : "/placeholder.svg";
  const characteristicIconMap = new Map(
    characteristicIcons.map((item) => [item.characteristic_key, item.icon_url || ""])
  );

  if (isLoading) {
    return (
      <PageBackground>
        <Header />
        <main className="flex-1 container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </PageBackground>
    );
  }

  if (error || !product) {
    return (
      <PageBackground>
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
      </PageBackground>
    );
  }

  const handleAddToCart = () => {
    if (!currentVariant) return;
    addItem(
      {
        id: product.id,
        variantId: currentVariant.id,
        handle: product.handle,
        title: product.title,
        variantTitle: currentVariant.title,
        priceHT: currentVariant.price_ht,
        priceTTC: currentVariant.price_ttc,
        image: productImage,
        promoGiftProductId: (product as any).promo_gift_product_id || undefined,
        promoGiftQuantity: (product as any).promo_gift_quantity || undefined,
        boxQuantity: product.box_quantity ?? null,
      },
      quantity
    );
    toast.success("Produit ajouté au panier", {
      description: `${product.title} - ${currentVariant.title} (x${quantity})`,
    });
  };

  const handleToggleFavorite = () => {
    if (!product || !currentVariant) return;
    toggleFavorite({
      id: product.id,
      handle: product.handle,
      title: product.title,
      image: productImage,
      priceHT: currentVariant.price_ht,
      priceTTC: currentVariant.price_ttc,
    });
    toast.success(
      isFavorite(product.id) ? "Retiré des favoris" : "Ajouté aux favoris",
      { description: product.title }
    );
  };

  const tags = product.tags || [];

  // Ordre aligné avec l’admin (CHARACTERISTIC_DEFINITIONS) : pictos sous l’image
  const technicalSpecs: {
    key: string;
    value: string;
    label: string;
    fallback: React.ReactNode;
  }[] = [];
  if (product.box_weight) {
    technicalSpecs.push({
      key: "box_weight",
      value: `${product.box_weight}`,
      label: "kg",
      fallback: <Scale className="h-4 w-4" />,
    });
  }
  if (product.diameter_mm) {
    technicalSpecs.push({
      key: "diameter_mm",
      value: `Ø${product.diameter_mm}`,
      label: "mm",
      fallback: <Circle className="h-4 w-4" />,
    });
  }
  if (product.length_mm) {
    technicalSpecs.push({
      key: "length_mm",
      value: `${product.length_mm}`,
      label: "mm",
      fallback: <Ruler className="h-4 w-4" />,
    });
  }
  if (product.usage) {
    technicalSpecs.push({
      key: "usage",
      value: product.usage,
      label: "",
      fallback: <Box className="h-4 w-4" />,
    });
  }
  if (product.material) {
    technicalSpecs.push({
      key: "material",
      value: product.material,
      label: "",
      fallback: <Layers className="h-4 w-4" />,
    });
  }
  if (product.drive_type) {
    const isTorx =
      product.drive_type.toLowerCase().startsWith("tx") ||
      product.drive_type.toLowerCase().includes("torx");
    technicalSpecs.push({
      key: "drive_type",
      value: product.drive_type,
      label: "",
      fallback: isTorx ? <TorxIcon className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />,
    });
  }
  if (product.thickness_to_fix_mm) {
    technicalSpecs.push({
      key: "thickness_to_fix_mm",
      value: `${product.thickness_to_fix_mm}`,
      label: "mm",
      fallback: <SlidersHorizontal className="h-4 w-4" />,
    });
  }
  if (product.thread_length_mm) {
    technicalSpecs.push({
      key: "thread_length_mm",
      value: `${product.thread_length_mm}`,
      label: "filet",
      fallback: <Wrench className="h-4 w-4" />,
    });
  }
  if (product.head_diameter_mm) {
    technicalSpecs.push({
      key: "head_diameter_mm",
      value: `Ø${product.head_diameter_mm}`,
      label: "tête",
      fallback: <Target className="h-4 w-4" />,
    });
  }

  return (
    <PageBackground>
      <Header />

      <main className="flex-1">
        <div className="container py-4 sm:py-6 px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6 overflow-x-auto">
            <Link to="/" className="hover:text-foreground shrink-0">
              Accueil
            </Link>
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <Link to="/produits" className="hover:text-foreground shrink-0">
              Produits
            </Link>
            {product.categories && (
              <>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <Link
                  to={`/produits?category=${product.categories.slug}`}
                  className="hover:text-foreground shrink-0"
                >
                  {product.categories.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="text-foreground truncate">{product.title}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
            {/* Product Images + Characteristics */}
            <div className="space-y-4">
              <div className="aspect-square bg-white rounded-lg flex items-center justify-center p-4 border border-border">
                <img
                  src={productImage}
                  alt={product.title}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              {/* Technical specifications as badges */}
              {technicalSpecs.length > 0 && (
                <div className="mt-4 flex flex-wrap items-start gap-3 sm:gap-4">
                  {technicalSpecs.map((spec) => (
                    <CharacteristicPicto
                      key={spec.key}
                      iconUrl={characteristicIconMap.get(spec.key)}
                      value={spec.value}
                      label={spec.label}
                      fallback={spec.fallback}
                    />
                  ))}
                </div>
              )}
              
              {/* Technical specifications from tags */}
              {tags.length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-semibold mb-2">Tags</h2>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              {/* Title & Badge */}
              <div>
                {product.categories && (
                  <Badge variant="secondary" className="mb-1">
                    {product.categories.name}
                  </Badge>
                )}
                <h1 className="text-xl font-bold text-foreground mb-1">
                  {product.title}
                </h1>
                {product.description && (
                  <div className="text-muted-foreground text-sm leading-relaxed space-y-2 mt-2">
                    {product.description.split(/\r?\n/).map((line, index) => {
                      const trimmedLine = line.trim();
                      if (!trimmedLine) return null;
                      
                      // Check if it's a bullet point line
                      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                        return (
                          <div key={index} className="flex items-start gap-2 pl-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>{trimmedLine.replace(/^[•\-]\s*/, '').replace(/^\t/, '')}</span>
                          </div>
                        );
                      }
                      
                      // Check if it's a header/title line (ends with specific keywords or is short and bold-looking)
                      if (trimmedLine.endsWith(':') || trimmedLine.includes('Avantages') || trimmedLine.includes('Pourquoi choisir')) {
                        return (
                          <p key={index} className="font-medium text-foreground mt-3 first:mt-0">
                            {trimmedLine}
                          </p>
                        );
                      }
                      
                      return <p key={index}>{trimmedLine}</p>;
                    })}
                  </div>
                )}
              </div>

              {/* Stock Status */}
              {currentVariant && (
                <div>
                  {currentVariant.available ? (
                    <span className="stock-badge stock-available">
                      <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                      En stock
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
                <div className="space-y-2">
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
                          {variant.title} - {formatPrice(variant.price_ttc)}
                          {!variant.available && " (Rupture)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Promo Banner */}
              {product.is_promo && product.promo_price_ht && (
                <div className="bg-gradient-to-r from-destructive/10 to-orange-500/10 border border-destructive/20 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-destructive text-destructive-foreground text-sm px-3 py-1">
                      PROMO -{Math.round(((product.price_ht - product.promo_price_ht) / product.price_ht) * 100)}%
                    </Badge>
                    {(product as any).promo_end_date && (
                      <span className="text-sm text-muted-foreground">
                        Jusqu'au {new Date((product as any).promo_end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm text-muted-foreground">Prix normal :</span>
                    <span className="text-lg line-through text-muted-foreground">{formatPrice(product.price_ttc)} TTC</span>
                    <span className="text-xs text-muted-foreground">({formatPriceHT(product.price_ht)} HT)</span>
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className="text-sm font-medium text-destructive">Prix promo :</span>
                    <span className="text-2xl font-bold text-destructive">
                      {formatPrice(Math.round(product.promo_price_ht * 1.2 * 100) / 100)} TTC
                    </span>
                    <span className="text-sm text-destructive">({formatPriceHT(product.promo_price_ht)} HT)</span>
                  </div>
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    Économie : {formatPrice(product.price_ttc - Math.round(product.promo_price_ht * 1.2 * 100) / 100)} TTC
                  </p>
                </div>
              )}

              {/* Price (non-promo) */}
              {currentVariant && !product.is_promo && (
                <div className="bg-secondary p-3 rounded-lg">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-2xl font-bold text-foreground">
                      {formatPrice(currentVariant.price_ttc)}
                    </span>
                    {product.box_quantity && (
                      <span className="text-sm text-muted-foreground">
                        / boîte de {product.box_quantity} {product.box_quantity === 1 ? "unité" : "unités"}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatPriceHT(currentVariant.price_ht)} HT
                  </p>
                </div>
              )}

              {/* Box quantity for promo products */}
              {product.is_promo && product.box_quantity && (
                <p className="text-sm text-muted-foreground">
                  Boîte de {product.box_quantity} {product.box_quantity === 1 ? "unité" : "unités"}
                </p>
              )}

              {/* Add to Cart */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
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
                <div className="flex gap-2 flex-1">
                  <Button
                    className="btn-cart flex-1"
                    size="lg"
                    onClick={handleAddToCart}
                    disabled={!currentVariant?.available}
                  >
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    <span className="hidden sm:inline">Ajouter au panier</span>
                    <span className="sm:hidden">Ajouter</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={handleToggleFavorite}
                    className={isFavorite(product.id) ? "text-destructive border-destructive hover:bg-destructive/10" : ""}
                  >
                    <Heart className={`h-5 w-5 ${isFavorite(product.id) ? "fill-current" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Quick benefits */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-3 border-t border-border">
                <div className="flex flex-col items-center text-center gap-0.5">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    Livraison 24/48h
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-0.5">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    Qualité garantie
                  </span>
                </div>
                <div className="flex flex-col items-center text-center gap-0.5">
                  <RotateCcw className="h-4 w-4 text-primary" />
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    Retour 30 jours
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
};

export default ProductDetailPage;
