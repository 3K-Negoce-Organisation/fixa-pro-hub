import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { shopifyFetch, PRODUCTS_QUERY, ShopifyProduct, formatPriceTTC } from "@/lib/shopify";

interface ShopifyProductsResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

export function QuickOrderSection() {
  const { data, isLoading } = useQuery({
    queryKey: ["quick-order-products"],
    queryFn: async () => {
      return shopifyFetch<ShopifyProductsResponse>(PRODUCTS_QUERY, {
        first: 4,
      });
    },
  });

  const recentProducts = data?.products?.edges?.map(({ node }) => ({
    id: node.id,
    handle: node.handle,
    title: node.title,
    priceHT: parseFloat(node.priceRange.minVariantPrice.amount),
    image: node.images.edges[0]?.node.url || "/placeholder.svg",
  })) || [];

  if (isLoading) {
    return (
      <section className="py-8 border-b border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Commandes rapides</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-secondary rounded-lg animate-pulse">
              <div className="w-12 h-12 bg-muted rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (recentProducts.length === 0) return null;

  return (
    <section className="py-8 border-b border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">Commandes rapides</h2>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/commandes">
            Historique
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recentProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-muted transition-colors"
          >
            <img
              src={product.image}
              alt={product.title}
              className="w-12 h-12 object-contain bg-background rounded"
            />
            <div className="flex-1 min-w-0">
              <Link
                to={`/produit/${product.handle}`}
                className="text-sm font-medium line-clamp-1 hover:text-primary"
              >
                {product.title.split(" - ")[0]}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatPriceTTC(product.priceHT)}
              </p>
            </div>
            <Button size="sm" variant="outline" className="shrink-0">
              +
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
