import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatPriceHT, formatPrice, calculateTTC } from "@/lib/products";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, totalHT } = useCart();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const totalTTC = calculateTTC(totalHT);

  const handleCheckout = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground" />
            <h1 className="text-2xl font-bold">Votre panier est vide</h1>
            <p className="text-muted-foreground">
              Découvrez nos produits et ajoutez-les à votre panier
            </p>
            <Button asChild>
              <Link to="/produits">Voir les produits</Link>
            </Button>
          </div>
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
                    className="shrink-0 w-24 h-24 bg-white rounded border border-border flex items-center justify-center"
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
                      {formatPrice(calculateTTC(item.priceHT))}
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
                      {formatPrice(calculateTTC(item.priceHT * item.quantity))}
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

            {/* Summary / Payment */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-4">
                {showPaymentForm ? (
                  <>
                    <h2 className="text-lg font-bold">Paiement sécurisé</h2>
                    <div className="border-b border-border pb-4 mb-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-muted-foreground">Total à payer</span>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(totalTTC)}
                        </span>
                      </div>
                    </div>
                    <StripePaymentForm
                      items={items}
                      totalTTC={totalTTC}
                      onSuccess={handlePaymentSuccess}
                      onCancel={handlePaymentCancel}
                    />
                  </>
                ) : (
                  <>
                    <h2 className="text-lg font-bold">Récapitulatif</h2>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sous-total TTC</span>
                        <span className="font-medium">{formatPrice(totalTTC)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>dont TVA (20%)</span>
                        <span>{formatPriceHT(totalHT * 0.2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Livraison</span>
                        <span>
                          {totalTTC >= 180 ? "Gratuite" : "Calculée à l'étape suivante"}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold">Total TTC</span>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(totalTTC)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {formatPriceHT(totalHT)} HT
                      </p>
                    </div>

                    {totalTTC < 180 && (
                      <p className="text-xs text-muted-foreground text-center">
                        Plus que {formatPrice(180 - totalTTC)} pour la livraison
                        gratuite !
                      </p>
                    )}

                    <Button 
                      className="w-full btn-cart" 
                      size="lg"
                      onClick={handleCheckout}
                    >
                      Payer
                    </Button>

                    <Button variant="outline" className="w-full" asChild>
                      <Link to="/produits">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Continuer mes achats
                      </Link>
                    </Button>
                  </>
                )}
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
