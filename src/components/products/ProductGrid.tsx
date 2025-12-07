import { ProductCard, DisplayProduct } from "./ProductCard";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";

interface ProductGridProps {
  products: DisplayProduct[];
  isLoading?: boolean;
}

export function ProductGrid({ products, isLoading }: ProductGridProps) {
  const { addItem } = useCart();

  const handleAddToCart = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (product) {
      addItem({
        id: product.id,
        variantId: `${product.id}-default`,
        handle: product.handle,
        title: product.title,
        variantTitle: "Unité",
        priceHT: product.priceHT,
        image: product.image,
      });
      toast.success("Produit ajouté au panier", {
        description: product.title,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="product-card animate-pulse">
            <div className="aspect-square bg-muted" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-2/3" />
              <div className="h-6 bg-muted rounded w-1/2 mt-4" />
              <div className="h-9 bg-muted rounded w-full mt-2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-lg font-medium text-foreground mb-2">
          Aucun produit trouvé
        </p>
        <p className="text-muted-foreground">
          Essayez de modifier vos filtres ou votre recherche.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={handleAddToCart}
        />
      ))}
    </div>
  );
}
