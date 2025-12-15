import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ProductCard, DisplayProduct } from "@/components/products/ProductCard";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct } from "@/lib/shopify";
import { toast } from "sonner";

interface ShopifyProductsResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

export function FeaturedProducts() {
  const { data, isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      return shopifyFetch<ShopifyProductsResponse>(PRODUCTS_QUERY, {
        first: 4,
      });
    },
  });

  const featuredProducts: DisplayProduct[] = data?.products?.edges?.map(({ node }) => {
    const price = parseFloat(node.priceRange.minVariantPrice.amount);
    const image = node.images.edges[0]?.node.url || "/placeholder.svg";
    const variant = node.variants.edges[0]?.node;
    
    return {
      id: node.id,
      variantId: variant?.id || node.id,
      handle: node.handle,
      title: node.title,
      priceHT: price,
      image,
      category: node.productType || "",
      specs: {
        diameter: node.tags.find(t => t.includes("mm") && !t.includes("x"))?.replace("mm", "") || "",
        length: node.tags.find(t => t.includes("x"))?.split("x")[1] || "",
        driveType: node.tags.find(t => ["Torx", "Pozidriv", "Phillips"].some(d => t.includes(d))) || "",
        material: node.tags.find(t => ["Inox", "Acier", "Zingué"].some(m => t.includes(m))) || "",
        headType: node.tags.find(t => ["Fraisée", "Plate", "Ronde"].some(h => t.includes(h))) || "",
      },
      stock: variant?.quantityAvailable ?? 0,
      inStock: variant?.availableForSale ?? false,
      tags: node.tags,
    };
  }) || [];

  const handleAddToCart = (productId: string) => {
    const product = featuredProducts.find((p) => p.id === productId);
    if (product) {
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
