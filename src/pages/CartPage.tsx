import { useState } from "react";
import { Link } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, RotateCcw, X, ChevronRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { PageBackground } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { BoxQuantityHint } from "@/components/cart/BoxQuantityHint";
import { formatPriceHT, formatPrice, calculateTTC, getDisplayVariantTitle } from "@/lib/products";
import {
  FREE_SHIPPING_THRESHOLD_TTC,
  orderGrandTotals,
} from "@/lib/shipping";
import { StripePaymentForm } from "@/components/checkout/StripePaymentForm";

const CartPage = () => {
  const { items, removedItems, removeItem, restoreItem, clearRemovedItems, updateQuantity, clearCart, totalHT } = useCart();
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  const { subtotalTTC, shippingTTC, grandTotalTTC, grandTotalHT } = orderGrandTotals(totalHT);
  const totalVatAmount = grandTotalTTC - grandTotalHT;

  const handleCheckout = () => {
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentForm(false);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
  };

  if (items.length === 0 && removedItems.length === 0) {
    return (
      <PageBackground>
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
      </PageBackground>
    );
  }

  return (
    <PageBackground>
      <Header />

      <main className="flex-1">
        <div className="container py-6 px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground flex items-center gap-1">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Accueil</span>
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">Panier</span>
          </nav>
          
          <h1 className="text-2xl font-bold mb-6">Votre panier</h1>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart items */}
            <div className="lg:col-span-2 space-y-4">
              {items.length === 0 ? (
                <div className="p-6 bg-card border border-border rounded-lg text-center">
                  <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Votre panier est vide</p>
                  <Button asChild className="mt-4">
                    <Link to="/produits">Voir les produits</Link>
                  </Button>
                </div>
              ) : (
                <>
                  {items.map((item) => (
                    <div
                      key={item.variantId}
                      className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 bg-card border border-border rounded-lg"
                    >
                      {/* Top row on mobile: image + details */}
                      <div className="flex gap-3 flex-1 min-w-0">
                        {/* Image */}
                        <Link
                          to={`/produit/${item.handle}`}
                          className="shrink-0 w-16 h-16 sm:w-24 sm:h-24 bg-white rounded border border-border flex items-center justify-center"
                        >
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-contain p-1 sm:p-2"
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/produit/${item.handle}`}
                            className="font-medium hover:text-primary line-clamp-2 text-sm sm:text-base"
                          >
                            {item.title}
                          </Link>
                          {item.isGift && (
                            <p className="text-xs text-emerald-600">Article offert</p>
                          )}
                          {getDisplayVariantTitle(item.variantTitle) && (
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {getDisplayVariantTitle(item.variantTitle)}
                            </p>
                          )}
                          {!item.isGift && (
                            <BoxQuantityHint
                              boxQuantity={item.boxQuantity}
                              variantTitle={item.variantTitle}
                            />
                          )}
                          <p className="text-sm font-semibold mt-1 sm:hidden">
                            {formatPrice(calculateTTC(item.priceHT))}
                          </p>
                        </div>
                      </div>

                      {/* Quantity & Actions - Row on mobile */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity - 1)
                            }
                            disabled={item.isGift}
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
                            className="w-12 sm:w-14 h-7 sm:h-8 text-center text-sm"
                            disabled={item.isGift}
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 sm:h-8 sm:w-8"
                            onClick={() =>
                              updateQuantity(item.variantId, item.quantity + 1)
                            }
                            disabled={item.isGift}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold hidden sm:block">
                            {formatPrice(calculateTTC(item.priceHT * item.quantity))}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.variantId)}
                            className="text-destructive hover:text-destructive h-7 w-7 sm:h-8 sm:w-8 p-0"
                            disabled={item.isGift}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                </>
              )}

              {/* Removed items section */}
              {removedItems.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Éléments supprimés ({removedItems.length})
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRemovedItems}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Effacer tout
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {removedItems.map((item) => (
                      <div
                        key={item.variantId}
                        className="flex items-center gap-3 p-3 bg-muted/50 border border-border/50 rounded-lg opacity-60"
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-12 h-12 object-contain bg-white rounded border"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {item.title}
                          </p>
                          {(() => {
                            const variantLabel = getDisplayVariantTitle(item.variantTitle);
                            return variantLabel ? (
                              <p className="text-xs text-muted-foreground">
                                {variantLabel} × {item.quantity}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Qté : {item.quantity}</p>
                            );
                          })()}
                          {!item.isGift && (
                            <BoxQuantityHint
                              boxQuantity={item.boxQuantity}
                              variantTitle={item.variantTitle}
                            />
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => restoreItem(item.variantId)}
                          className="shrink-0 text-xs"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restaurer
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Summary / Payment */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-4">
                {showPaymentForm ? (
                  <>
                    <h2 className="text-lg font-bold">Paiement sécurisé</h2>
                    <div className="space-y-2 text-sm border-b border-border pb-4 mb-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sous-total TTC</span>
                        <span className="font-medium">{formatPrice(subtotalTTC)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Frais de livraison</span>
                        <span>
                          {shippingTTC === 0 ? "Gratuite" : formatPrice(shippingTTC)}
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline pt-2 border-t border-border">
                        <span className="font-semibold text-foreground">Total à payer</span>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(grandTotalTTC)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {formatPriceHT(grandTotalHT)} HT
                      </p>
                    </div>
                    <StripePaymentForm
                      items={items}
                      totalTTC={grandTotalTTC}
                      totalHT={grandTotalHT}
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
                        <span className="font-medium">{formatPrice(subtotalTTC)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Frais de livraison</span>
                        <span>
                          {shippingTTC === 0 ? "Gratuite" : formatPrice(shippingTTC)}
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>dont TVA (20%)</span>
                        <span>{formatPriceHT(totalVatAmount)}</span>
                      </div>
                    </div>

                    <div className="border-t border-border pt-4">
                      <div className="flex justify-between items-baseline">
                        <span className="font-bold">Total TTC</span>
                        <span className="text-xl font-bold text-primary">
                          {formatPrice(grandTotalTTC)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        {formatPriceHT(grandTotalHT)} HT
                      </p>
                    </div>

                    {subtotalTTC < FREE_SHIPPING_THRESHOLD_TTC && (
                      <p className="text-xs text-muted-foreground text-center">
                        Plus que {formatPrice(FREE_SHIPPING_THRESHOLD_TTC - subtotalTTC)} pour la livraison
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
    </PageBackground>
  );
};

export default CartPage;
