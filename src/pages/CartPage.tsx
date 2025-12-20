import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatPriceHT, formatPrice, calculateTTC } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const PAYMENT_CHANNEL = "payment-status";

type PaymentStatus = "idle" | "pending" | "success" | "cancelled";

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, totalHT } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const { toast } = useToast();
  const navigate = useNavigate();

  const totalTTC = calculateTTC(totalHT);

  // Listen for payment status from the checkout tab - always active
  useEffect(() => {
    const channel = new BroadcastChannel(PAYMENT_CHANNEL);
    
    channel.onmessage = (event) => {
      console.log("Received payment status:", event.data);
      if (event.data.status === "success") {
        setPaymentStatus("success");
        clearCart();
      } else if (event.data.status === "cancelled") {
        setPaymentStatus("cancelled");
      }
    };

    return () => {
      channel.close();
    };
  }, [clearCart]);

  const handleCheckout = async () => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erreur",
          description: "Vous devez être connecté pour passer commande.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Create Stripe checkout session
      console.log('Creating Stripe checkout session...');
      const { data: checkoutResult, error: checkoutError } = await supabase.functions.invoke(
        'create-stripe-checkout',
        {
          body: { items },
        }
      );

      console.log('Checkout result:', checkoutResult);
      console.log('Checkout error:', checkoutError);

      if (checkoutError || !checkoutResult?.url) {
        console.error('Checkout error:', checkoutError || checkoutResult?.error);
        toast({
          title: "Erreur",
          description: checkoutResult?.error || "Impossible de créer le checkout. Veuillez réessayer.",
          variant: "destructive",
        });
        return;
      }

      // Set payment as pending and open Stripe checkout in new tab
      setPaymentStatus("pending");
      console.log('Opening checkout in new tab:', checkoutResult.url);
      window.open(checkoutResult.url, '_blank');
    } catch (error) {
      console.error("Checkout error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de procéder au paiement. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryPayment = () => {
    setPaymentStatus("idle");
  };

  // Payment pending state
  if (paymentStatus === "pending") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h1 className="text-2xl font-bold mb-2">Paiement en cours...</h1>
          <p className="text-muted-foreground mb-6">
            Veuillez compléter votre paiement dans l'onglet Stripe ouvert.
          </p>
          <p className="text-sm text-muted-foreground">
            Cette page se mettra à jour automatiquement une fois le paiement effectué.
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  // Payment success state
  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Paiement réussi !</h1>
          <p className="text-muted-foreground mb-6">
            Votre commande a été confirmée. Vous recevrez un email de confirmation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild>
              <Link to="/suivi">
                Suivre ma commande
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/produits">
                Continuer mes achats
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Payment cancelled state
  if (paymentStatus === "cancelled") {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Paiement annulé</h1>
          <p className="text-muted-foreground mb-6">
            Votre paiement a été annulé. Aucun montant n'a été débité.
          </p>
          <Button onClick={handleRetryPayment}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au panier
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

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

            {/* Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 bg-card border border-border rounded-lg p-6 space-y-4">
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirection...
                    </>
                  ) : (
                    "Payer"
                  )}
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
