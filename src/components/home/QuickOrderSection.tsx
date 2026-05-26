import { Link } from "react-router-dom";
import { Clock, ArrowRight, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { fetchProducts, getProductImage, formatPrice } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

export function QuickOrderSection() {
  const { addItem } = useCart();
  const { toast } = useToast();
  
  const { data: products, isLoading } = useQuery({
    queryKey: ["quick-order-products"],
    queryFn: () => fetchProducts(),
  });

  const recentProducts = (products?.slice(0, 4) || []).map((product) => ({
    id: product.id,
    handle: product.handle,
    title: product.title,
    priceHT: product.price_ht,
    priceTTC: product.price_ttc,
    image: getProductImage(product),
    boxQuantity: product.box_quantity ?? null,
  }));

  const handleAddToCart = (product: typeof recentProducts[0]) => {
    addItem({
      id: product.id,
      variantId: `${product.id}-unit`,
      handle: product.handle,
      title: product.title,
      variantTitle: "Unité",
      priceHT: product.priceHT,
      priceTTC: product.priceTTC,
      image: product.image,
      boxQuantity: product.boxQuantity ?? null,
    }, 1);
    toast({
      title: "Produit ajouté",
      description: `${product.title.split(" - ")[0]} ajouté au panier`,
    });
  };

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
          <Link to="/compte?tab=orders">
            Historique
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recentProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-primary/10 transition-colors"
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
                {formatPrice(product.priceTTC)}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="shrink-0"
              onClick={() => handleAddToCart(product)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
