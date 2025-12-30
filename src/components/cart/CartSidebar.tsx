import { Link } from "react-router-dom";
import { X, Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCart } from "@/contexts/CartContext";
import { formatPriceHT, formatPrice, calculateTTC } from "@/lib/products";

export function CartSidebar() {
  const { items, removeItem, updateQuantity, totalHT, totalItems, isOpen, toggleCart } = useCart();
  const totalTTC = calculateTTC(totalHT);

  if (!isOpen) return null;

  return (
    <div className="fixed top-0 right-0 h-full w-56 bg-background border-l border-border shadow-xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Panier ({totalItems})</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={toggleCart}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-4">Votre panier est vide</p>
            <Button asChild onClick={toggleCart}>
              <Link to="/produits">Voir les produits</Link>
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {items.map((item) => (
                  <div 
                    key={item.variantId} 
                    className="flex gap-3 p-3 bg-secondary/50 rounded-lg"
                  >
                    {/* Image */}
                    <Link 
                      to={`/produit/${item.handle}`} 
                      onClick={toggleCart}
                      className="shrink-0"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-16 h-16 object-contain bg-white rounded border"
                      />
                    </Link>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/produit/${item.handle}`}
                        onClick={toggleCart}
                        className="text-sm font-medium hover:text-primary line-clamp-2"
                      >
                        {item.title}
                      </Link>
                      {item.variantTitle && item.variantTitle !== "Unité" && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.variantTitle}
                        </p>
                      )}
                      
                      {/* Price */}
                      <div className="mt-1">
                        <span className="text-sm font-semibold">
                          {formatPrice(calculateTTC(item.priceHT * item.quantity))}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatPriceHT(item.priceHT)} HT/u)
                        </span>
                      </div>

                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center border rounded">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => removeItem(item.variantId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-border p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HT</span>
                <span>{formatPriceHT(totalHT)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total TTC</span>
                <span className="text-lg">{formatPrice(totalTTC)}</span>
              </div>
              <Button asChild className="w-full btn-cart" size="lg" onClick={toggleCart}>
                <Link to="/panier">Voir le panier complet</Link>
              </Button>
            </div>
          </>
        )}
    </div>
  );
}
