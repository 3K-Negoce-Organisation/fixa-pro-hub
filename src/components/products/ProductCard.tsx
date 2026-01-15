import { Link } from "react-router-dom";
import { ShoppingCart, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPriceHT, formatPrice } from "@/lib/products";

export interface DisplayProduct {
  id: string;
  variantId: string;
  handle: string;
  title: string;
  priceHT: number;
  priceTTC: number;
  originalPriceHT?: number;
  originalPriceTTC?: number;
  image: string;
  category: string;
  diameter_mm?: number | null;
  length_mm?: number | null;
  material?: string | null;
  drive_type?: string | null;
  stock: number;
  inStock: boolean;
  isPromo?: boolean;
  promoEndDate?: string | null;
}

// Helper to calculate discount percentage
const calculateDiscountPercent = (originalPrice: number, promoPrice: number): number => {
  if (!originalPrice || originalPrice <= 0) return 0;
  return Math.round(((originalPrice - promoPrice) / originalPrice) * 100);
};

interface ProductCardProps {
  product: DisplayProduct;
  onAddToCart?: (productId: string) => void;
}

export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    onAddToCart?.(product.id);
  };

  const discountPercent = product.isPromo && product.originalPriceTTC 
    ? calculateDiscountPercent(product.originalPriceTTC, product.priceTTC)
    : 0;

  return (
    <div className="product-card group flex flex-col h-full">
      {/* Image */}
      <div className="relative block w-32 h-32 mx-auto bg-white p-2 rounded-lg">
        {product.isPromo && discountPercent > 0 && (
          <Badge className="absolute top-1 right-1 z-10 bg-destructive text-destructive-foreground text-[10px]">
            -{discountPercent}%
          </Badge>
        )}
        <Link to={`/produit/${product.handle}`}>
          <img
            src={product.image}
            alt={product.title}
            className="w-full h-full object-contain"
          />
        </Link>
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
      </div>

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
          {product.diameter_mm && (
            <span className="bg-muted px-1.5 py-0.5 rounded">Ø{product.diameter_mm}mm</span>
          )}
          {product.length_mm && (
            <span className="bg-muted px-1.5 py-0.5 rounded">{product.length_mm}mm</span>
          )}
          {product.drive_type && (
            <span className="bg-muted px-1.5 py-0.5 rounded">{product.drive_type}</span>
          )}
        </div>

        {/* Stock status */}
        <div className="mb-2">
          {product.inStock ? (
            <span className="stock-badge stock-available text-xs">
              <span className="w-2 h-2 stock-dot-available rounded-full"></span>
              En stock
            </span>
          ) : (
            <span className="stock-badge stock-out text-xs">
              <span className="w-2 h-2 stock-dot-out rounded-full"></span>
              Rupture
            </span>
          )}
        </div>

        {/* Price section */}
        <div className="mt-auto">
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`price-ttc text-lg font-bold ${product.isPromo ? 'text-destructive' : 'text-foreground'}`}>
              {formatPrice(product.priceTTC)}
            </span>
            {product.originalPriceTTC && (
              <span className="text-sm text-muted-foreground line-through">
                {formatPrice(product.originalPriceTTC)}
              </span>
            )}
          </div>
          <p className="price-ht text-xs text-muted-foreground">
            {formatPriceHT(product.priceHT)} HT
            {product.originalPriceHT && (
              <span className="ml-1 line-through">{formatPriceHT(product.originalPriceHT)}</span>
            )}
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
