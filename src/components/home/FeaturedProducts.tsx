import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductCard, DisplayProduct } from "@/components/products/ProductCard";
import { fetchProducts, getProductImage, Product } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

function mapProductToDisplay(product: Product): DisplayProduct {
  return {
    id: product.id,
    variantId: product.id,
    handle: product.handle,
    title: product.title,
    priceHT: product.price_ht,
    priceTTC: product.price_ttc,
    image: getProductImage(product),
    category: product.categories?.name || product.category || "",
    diameter_mm: product.diameter_mm,
    length_mm: product.length_mm,
    material: product.material,
    drive_type: product.drive_type,
    stock: product.stock ?? 0,
    inStock: (product.stock ?? 0) > 0,
    variantTitle: "Unité",
    boxQuantity: product.box_quantity ?? null,
  };
}

export function FeaturedProducts() {
  const { addItem } = useCart();
  const { data: products, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: () => fetchProducts(),
  });

  const featuredProducts: DisplayProduct[] = (products?.slice(0, 4) || []).map(mapProductToDisplay);

  const handleAddToCart = (productId: string) => {
    const product = featuredProducts.find((p) => p.id === productId);
    if (product) {
      addItem({
        id: product.id,
        variantId: product.variantId,
        handle: product.handle,
        title: product.title,
        variantTitle: product.variantTitle || "Unité",
        priceHT: product.priceHT,
        priceTTC: product.priceTTC,
        image: product.image,
        boxQuantity: product.boxQuantity ?? null,
      });
      toast.success("Produit ajouté au panier", {
        description: product.title,
      });
    }
  };

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-lg">Produits populaires</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="product-card animate-pulse">
              <div className="aspect-square bg-muted" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-6 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (featuredProducts.length === 0) return null;

  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-lg">Produits populaires</h2>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/produits">
            Voir tout
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {featuredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={handleAddToCart}
          />
        ))}
      </div>
    </section>
  );
}
