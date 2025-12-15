import { Link } from "react-router-dom";
import { ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPriceHT, formatPriceTTC } from "@/lib/shopify";

export interface DisplayProduct {
  id: string;
  handle: string;
  title: string;
  priceHT: number;
  image: string;
  category: string;
  specs: {
    diameter: string;
    length: string;
    driveType: string;
    material: string;
    headType: string;
  };
  stock: number;
  inStock: boolean;
  tags: string[];
}

interface ProductCardProps {
  product: DisplayProduct;
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart?.(product.id);
  };

  return (
    <div className="product-card group flex flex-col h-full">
      {/* Image */}
      <Link to={`/produit/${product.handle}`} className="relative block w-32 h-32 mx-auto bg-muted p-2">
        <img
          src={product.image}
          alt={product.title}
          className="w-full h-full object-contain"
        />
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          asChild
        >
          <Link to={`/produit/${product.handle}`}>
            <Eye className="h-4 w-4 mr-1" />
            Détails
          </Link>
        </Button>
      </Link>

      {/* Content */}
      <div className="flex flex-col flex-1 p-3">
        {/* Category badge */}
        {product.category && (
          <div className="mb-1.5">
            <Badge variant="secondary" className="text-[10px] font-medium">
              {product.category}
            </Badge>
          </div>
        )}

        {/* Title */}
        <Link
          to={`/produit/${product.handle}`}
          className="text-sm font-medium leading-tight hover:text-primary line-clamp-2 mb-2"
        >
          {product.title}
        </Link>

        {/* Specs preview */}
        <div className="flex flex-wrap gap-1 mb-3 text-[10px] text-muted-foreground">
          {product.specs.diameter && (
            <span className="bg-muted px-1.5 py-0.5 rounded">{product.specs.diameter}</span>
          )}
          {product.specs.length && (
            <span className="bg-muted px-1.5 py-0.5 rounded">{product.specs.length}</span>
          )}
          {product.specs.driveType && (
            <span className="bg-muted px-1.5 py-0.5 rounded">{product.specs.driveType}</span>
          )}
        </div>

        {/* Stock status */}
        <div className="mb-2">
          {product.inStock ? (
            <span className="stock-badge stock-available text-xs">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              En stock ({product.stock})
            </span>
          ) : (
            <span className="stock-badge stock-out text-xs">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Rupture
            </span>
          )}
        </div>

        {/* Price section */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="price-ttc text-lg font-bold text-foreground">
              {formatPriceTTC(product.priceHT)}
            </span>
          </div>
          <p className="price-ht text-xs text-muted-foreground">
            {formatPriceHT(product.priceHT)} HT
          </p>
        </div>

        {/* Add to cart */}
        <Button
          className="btn-cart w-full mt-3"
          size="sm"
          onClick={handleAddToCart}
          disabled={!product.inStock}
        >
          <ShoppingCart className="h-4 w-4 mr-1.5" />
          Ajouter au panier
        </Button>
      </div>
    </div>
  );
}
