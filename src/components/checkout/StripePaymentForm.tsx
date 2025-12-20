import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  AddressElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CreditCard, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCart, CartItem } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

const STRIPE_PUBLISHABLE_KEY = "pk_test_51Sd81FLdlL70a9Pj6JpRNhY6hna6DZZ8I4Id57wBuIppTvQh3GA4RQwpMAFR3h7dSMOstwk45IdQjqRlDYGACA4R00mUtZfUP7";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);

interface CheckoutFormProps {
  totalTTC: number;
  userEmail: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormInnerProps extends CheckoutFormProps {
  items: CartItem[];
  totalHT: number;
}

const CheckoutForm = ({ totalTTC, userEmail, onSuccess, onCancel, items, totalHT }: CheckoutFormInnerProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  // Generate order number
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VIS-${year}${month}-${random}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Veuillez saisir votre numéro de téléphone");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Get shipping address from AddressElement before confirming payment
    const addressElement = elements.getElement('address');
    let shippingName = null;
    let shippingAddress = null;
    let shippingCity = null;
    let shippingPostalCode = null;
    
    if (addressElement) {
      const { complete, value } = await addressElement.getValue();
      if (complete && value.address) {
        shippingName = value.name || null;
        shippingAddress = value.address.line1 + (value.address.line2 ? `, ${value.address.line2}` : '');
        shippingCity = value.address.city;
        shippingPostalCode = value.address.postal_code;
      }
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation`,
        receipt_email: userEmail,
        payment_method_data: {
          billing_details: {
            email: userEmail,
            phone: phone,
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Une erreur est survenue");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Create order in database with shipping address
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Utilisateur non connecté");

        const orderNumber = generateOrderNumber();
        
        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            user_email: userEmail,
            order_number: orderNumber,
            status: 'paid',
            total_ht: totalHT,
            total_ttc: totalTTC,
            shipping_name: shippingName,
            shipping_address: shippingAddress,
            shipping_city: shippingCity,
            shipping_postal_code: shippingPostalCode,
            notes: `Payment Intent: ${paymentIntent.id}`,
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items
        const orderItems = items.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          product_image: item.image,
          variant_title: item.variantTitle,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;

        toast({
          title: "Paiement réussi !",
          description: `Commande ${orderNumber} confirmée.`,
        });
        clearCart();
        onSuccess();
        navigate(`/confirmation?order_number=${orderNumber}`);
      } catch (err) {
        console.error("Error creating order:", err);
        toast({
          title: "Attention",
          description: "Paiement réussi mais erreur lors de l'enregistrement. Contactez le support.",
          variant: "destructive",
        });
      }
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={userEmail}
          disabled
          className="bg-muted"
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone *</Label>
        <Input
          id="phone"
          type="tel"
          placeholder="06 12 34 56 78"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>

      {/* Shipping Address */}
      <div className="space-y-2">
        <Label>Adresse de livraison *</Label>
        <div className="p-4 bg-muted/50 rounded-lg">
          <AddressElement
            options={{
              mode: "shipping",
              allowedCountries: ["FR"],
              fields: {
                phone: "never",
              },
            }}
          />
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-2">
        <Label>Paiement *</Label>
        <div className="p-4 bg-muted/50 rounded-lg">
          <PaymentElement
            options={{
              layout: "tabs",
            }}
          />
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Paiement sécurisé par Stripe</span>
      </div>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isProcessing}
          className="flex-1"
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isProcessing}
          className="flex-1 btn-cart"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traitement...
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              Payer {formatPrice(totalTTC)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

interface StripePaymentFormProps {
  items: CartItem[];
  totalTTC: number;
  totalHT?: number;
  onSuccess: () => void;
  onCancel: () => void;
}

export const StripePaymentForm = ({ items, totalTTC, onSuccess, onCancel }: StripePaymentFormProps) => {
  // Calculate totalHT from items
  const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
        // Get user email
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          setUserEmail(user.email);
        }

        const { data, error } = await supabase.functions.invoke("create-payment-intent", {
          body: { items },
        });

        if (error || data?.error) {
          throw new Error(data?.error || error?.message || "Erreur lors de la création du paiement");
        }

        setClientSecret(data.clientSecret);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [items, toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Préparation du paiement...</p>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-destructive">{error || "Impossible de charger le formulaire de paiement"}</p>
        <Button variant="outline" onClick={onCancel}>
          Retour au panier
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: "#f97316",
            colorBackground: "#ffffff",
            colorText: "#1f2937",
            borderRadius: "8px",
            fontFamily: "system-ui, sans-serif",
          },
          rules: {
            ".Label": {
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: "500",
            },
            ".Input": {
              padding: "12px",
              fontSize: "14px",
            },
          },
        },
        locale: "fr",
      }}
    >
      <CheckoutForm 
        totalTTC={totalTTC}
        totalHT={totalHT}
        items={items}
        userEmail={userEmail}
        onSuccess={onSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
};
