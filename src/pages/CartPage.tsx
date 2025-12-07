import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatPriceHT, formatPriceTTC } from "@/lib/shopify";

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, totalHT } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Votre panier est vide</h1>
          <p className="text-muted-foreground mb-6">
            Parcourez notre catalogue pour trouver les produits dont vous avez besoin.
          </p>
          <Button asChild>
            <Link to="/produits">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voir les produits
            </Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          <h1 className="text-2xl font-bold mb-6">Votre panier</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex gap-4 p-4 bg-card border border-border rounded-lg"
                >
                  {/* Image */}
                  <Link
                    to={`/produit/${item.handle}`}
                    className="shrink-0 w-24 h-24 bg-muted rounded flex items-center justify-center"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-contain p-2"
                    />
                  </Link>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produit/${item.handle}`}
                      className="font-medium hover:text-primary line-clamp-2"
                    >
                      {item.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {item.variantTitle}
                    </p>
                    <p className="text-sm font-semibold mt-1">
                      {formatPriceHT(item.priceHT)} HT
                    </p>
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.variantId)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(
                            item.variantId,
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-14 h-8 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.variantId, item.quantity + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>

                    <p className="text-sm font-bold">
                      {formatPriceHT(item.priceHT * item.quantity)} HT
                    </p>
                  </div>
                </div>
              ))}

              <Button
                variant="ghost"
                size="sm"
                onClick={clearCart}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Vider le panier
              </Button>
            </div>

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-lg font-bold">Récapitulatif</h2>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sous-total HT</span>
                    <span className="font-medium">{formatPriceHT(totalHT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TVA (20%)</span>
                    <span className="font-medium">
                      {formatPriceHT(totalHT * 0.2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>
                      {totalHT >= 150 ? "Gratuite" : "Calculée à l'étape suivante"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold">Total TTC</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPriceTTC(totalHT)}
                    </span>
                  </div>
                </div>

                {totalHT < 150 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Plus que {formatPriceHT(150 - totalHT)} HT pour la livraison
                    gratuite !
                  </p>
                )}

                <Button className="w-full btn-cart" size="lg">
                  Commander
                </Button>

                <Button variant="outline" className="w-full" asChild>
                  <Link to="/produits">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Continuer mes achats
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
