import { Link } from "react-router-dom";
import { ArrowRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { mockProducts } from "@/lib/mockData";
import { toast } from "sonner";

export function FeaturedProducts() {
  const featuredProducts = mockProducts.slice(0, 4);

  const handleAddToCart = (productId: string) => {
    const product = mockProducts.find((p) => p.id === productId);
    if (product) {
      toast.success("Produit ajouté au panier", {
        description: product.title,
      });
    }
  };

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
