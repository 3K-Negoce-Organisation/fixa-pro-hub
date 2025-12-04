import { Link } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockProducts } from "@/lib/mockData";
import { formatPriceHT } from "@/lib/shopify";

export function QuickOrderSection() {
  // Simulate recently viewed products
  const recentProducts = mockProducts.slice(0, 4);

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
                {formatPriceHT(product.priceHT)} HT
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
