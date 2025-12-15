import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";
import { formatPriceHT, formatPriceTTC } from "@/lib/shopify";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CartPage = () => {
  const { items, removeItem, updateQuantity, clearCart, totalHT } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleOrder = async () => {
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

      const totalTTC = totalHT * 1.2;
      const orderNumber = `VB-${Date.now().toString(36).toUpperCase()}`;

      // Create order in Supabase
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_ht: totalHT,
          total_ttc: totalTTC,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items in Supabase
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_title: item.title,
        variant_title: item.variantTitle,
        product_image: item.image,
        quantity: item.quantity,
        unit_price_ht: item.priceHT,
        unit_price_ttc: item.priceHT * 1.2,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Send order to Shopify
      const { data: shopifyResult, error: shopifyError } = await supabase.functions.invoke(
        'create-shopify-order',
        {
          body: {
            items: items.map(item => ({
              variantId: item.variantId,
              quantity: item.quantity,
              title: item.title,
              priceHT: item.priceHT,
            })),
            orderNumber,
            customerEmail: user.email,
          },
        }
      );

      if (shopifyError) {
        console.error('Shopify order error:', shopifyError);
        // Continue even if Shopify fails - order is saved locally
      } else if (shopifyResult?.success) {
        console.log('Shopify order created:', shopifyResult);
        // Update order with Shopify reference
        await supabase
          .from("orders")
          .update({ 
            notes: `Shopify: ${shopifyResult.shopifyOrderName || shopifyResult.shopifyOrderId}`,
            status: "confirmed"
          })
          .eq("id", order.id);
      }

      clearCart();
      toast({
        title: "Commande confirmée",
        description: `Votre commande ${orderNumber} a été enregistrée${shopifyResult?.success ? ' et envoyée à Shopify' : ''}.`,
      });
      navigate(`/suivi?order=${orderNumber}`);
    } catch (error) {
      console.error("Order error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de créer la commande. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
                      {formatPriceTTC(item.priceHT)}
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
                      {formatPriceTTC(item.priceHT * item.quantity)}
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
                    <span className="font-medium">{formatPriceTTC(totalHT)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>dont TVA (20%)</span>
                    <span>{formatPriceHT(totalHT * 0.2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Livraison</span>
                    <span>
                      {totalHT * 1.2 >= 180 ? "Gratuite" : "Calculée à l'étape suivante"}
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
                  <p className="text-xs text-muted-foreground text-right">
                    {formatPriceHT(totalHT)} HT
                  </p>
                </div>

                {totalHT * 1.2 < 180 && (
                  <p className="text-xs text-muted-foreground text-center">
                    Plus que {formatPriceTTC((180 / 1.2) - totalHT)} pour la livraison
                    gratuite !
                  </p>
                )}

                <Button 
                  className="w-full btn-cart" 
                  size="lg"
                  onClick={handleOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    "Commander"
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
