import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, RotateCcw, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { BoxQuantityHint } from "@/components/cart/BoxQuantityHint";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function CartDrawer() {
  const {
    items,
    removedItems,
    removeItem,
    restoreItem,
    updateQuantity,
    totalItems,
    totalHT,
    isOpen,
    toggleCart,
    closeCart,
  } = useCart();

  const TVA_RATE = 0.20;
  const totalTVA = totalHT * TVA_RATE;
  const totalTTC = totalHT + totalTVA;

  return (
    <Sheet open={isOpen} onOpenChange={toggleCart}>
      <SheetTrigger asChild>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-primary-foreground/10 rounded transition-colors whitespace-nowrap relative">
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center text-white text-xs font-bold rounded-full bg-success">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </div>
          <span className="hidden md:inline">Panier</span>
        </button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Panier ({totalItems} article{totalItems > 1 ? "s" : ""})
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Votre panier est vide</p>
            <Button asChild onClick={closeCart}>
              <Link to="/produits">Découvrir nos produits</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {items.map((item) => (
                  <div key={item.variantId} className="flex gap-3">
                    <div className="w-16 h-16 bg-muted rounded overflow-hidden shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ShoppingCart className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">{item.title}</h4>
                      {item.isGift && (
                        <p className="text-[11px] text-emerald-600">Article offert</p>
                      )}
                      {item.variantTitle && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.variantTitle}
                        </p>
                      )}
                      {!item.isGift && (
                        <BoxQuantityHint
                          boxQuantity={item.boxQuantity}
                          variantTitle={item.variantTitle}
                        />
                      )}
                      <p className="text-sm font-semibold text-primary mt-1">
                        {item.isGift ? "Offert" : `${item.priceHT.toFixed(2)} € HT`}
                      </p>
                      
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => removeItem(item.variantId)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          title="Supprimer"
                          disabled={item.isGift}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <div className="flex items-center border rounded">
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                            className="p-1 hover:bg-muted transition-colors"
                            disabled={item.isGift}
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="px-2 text-sm min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                            className="p-1 hover:bg-muted transition-colors"
                            disabled={item.isGift}
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Removed items section */}
              {removedItems.length > 0 && (
                <div className="px-4 pb-4">
                  <Separator className="mb-4" />
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">
                    Éléments supprimés
                  </h4>
                  <div className="space-y-2">
                    {removedItems.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded text-muted-foreground"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs truncate">{item.title}</p>
                          {item.variantTitle && (
                            <p className="text-xs truncate opacity-70">
                              {item.variantTitle}
                            </p>
                          )}
                          {!item.isGift && (
                            <BoxQuantityHint
                              boxQuantity={item.boxQuantity}
                              variantTitle={item.variantTitle}
                              className="truncate opacity-70"
                            />
                          )}
                        </div>
                        <button
                          onClick={() => restoreItem(item.variantId)}
                          className="p-1.5 hover:bg-background rounded transition-colors ml-2"
                          title="Restaurer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* Footer with totals */}
            <div className="border-t p-4 space-y-3 bg-background">
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sous-total HT</span>
                  <span>{totalHT.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA (20%)</span>
                  <span>{totalTVA.toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-base">
                  <span>Total TTC</span>
                  <span className="text-primary">{totalTTC.toFixed(2)} €</span>
                </div>
              </div>

              <Button asChild className="w-full" size="lg" onClick={closeCart}>
                <Link to="/panier">Voir le panier complet</Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
