import { useState, useEffect, useRef } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
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
import { Loader2, CreditCard, Lock, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useCart, CartItem } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";

const STRIPE_PUBLISHABLE_KEY = "pk_test_51Sd81FLdlL70a9Pj6JpRNhY6hna6DZZ8I4Id57wBuIppTvQh3GA4RQwpMAFR3h7dSMOstwk45IdQjqRlDYGACA4R00mUtZfUP7";

// Load Stripe with error handling
const loadStripeWithRetry = async (): Promise<Stripe | null> => {
  console.log("[STRIPE] Starting Stripe.js load...");
  try {
    const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
    if (stripe) {
      console.log("[STRIPE] Stripe.js loaded successfully");
    } else {
      console.error("[STRIPE] Stripe.js returned null - possible ad blocker or network issue");
    }
    return stripe;
  } catch (error) {
    console.error("[STRIPE] Failed to load Stripe.js:", error);
    return null;
  }
};

const stripePromise = loadStripeWithRetry();

interface CheckoutFormProps {
  totalTTC: number;
  userEmail: string;
  isGuest: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface CheckoutFormInnerProps extends CheckoutFormProps {
  items: CartItem[];
  totalHT: number;
  setUserEmail: (email: string) => void;
}

const ELEMENTS_READY_TIMEOUT_MS = 15000; // 15 seconds for elements to load

const CheckoutForm = ({ totalTTC, userEmail, isGuest, onSuccess, onCancel, items, totalHT, setUserEmail }: CheckoutFormInnerProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [paymentReady, setPaymentReady] = useState(false);
  const [addressReady, setAddressReady] = useState(false);
  const [elementsTimedOut, setElementsTimedOut] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const elementsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Log Stripe Elements status
  useEffect(() => {
    console.log("[STRIPE] CheckoutForm mounted - stripe:", !!stripe, "elements:", !!elements);
  }, [stripe, elements]);

  // Timeout for elements loading
  useEffect(() => {
    elementsTimeoutRef.current = setTimeout(() => {
      if (!paymentReady || !addressReady) {
        console.error("[STRIPE] Elements timed out - paymentReady:", paymentReady, "addressReady:", addressReady);
        setElementsTimedOut(true);
      }
    }, ELEMENTS_READY_TIMEOUT_MS);

    return () => {
      if (elementsTimeoutRef.current) {
        clearTimeout(elementsTimeoutRef.current);
      }
    };
  }, []);

  // Clear timeout when both elements are ready
  useEffect(() => {
    if (paymentReady && addressReady && elementsTimeoutRef.current) {
      console.log("[STRIPE] Both elements ready, clearing timeout");
      clearTimeout(elementsTimeoutRef.current);
      elementsTimeoutRef.current = null;
    }
  }, [paymentReady, addressReady]);

  const handlePaymentReady = () => {
    console.log("[STRIPE] PaymentElement ready");
    setPaymentReady(true);
  };

  const handleAddressReady = () => {
    console.log("[STRIPE] AddressElement ready");
    setAddressReady(true);
  };

  // Generate order number
  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `VIS-${year}${month}-${random}`;
  };

  // Generate guest user ID
  const generateGuestId = () => {
    return `guest_${crypto.randomUUID()}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("[STRIPE] Form submitted - stripe:", !!stripe, "elements:", !!elements);

    if (!stripe || !elements) {
      console.error("[STRIPE] Stripe or Elements not available");
      setErrorMessage("Le système de paiement n'est pas disponible. Veuillez rafraîchir la page.");
      return;
    }

    if (!phone.trim()) {
      setErrorMessage("Veuillez saisir votre numéro de téléphone");
      return;
    }

    if (isGuest && !email.trim()) {
      setErrorMessage("Veuillez saisir votre adresse email");
      return;
    }

    // Basic email validation for guests
    if (isGuest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMessage("Veuillez saisir une adresse email valide");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    // Update parent email state for guest
    if (isGuest) {
      setUserEmail(email);
    }

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

    const finalEmail = isGuest ? email : userEmail;

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation`,
        receipt_email: finalEmail,
        payment_method_data: {
          billing_details: {
            email: finalEmail,
            phone: phone,
          },
        },
      },
      redirect: "if_required",
    });

    if (error) {
      console.error("[STRIPE] Payment error:", error);
      setErrorMessage(error.message || "Une erreur est survenue");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      console.log("[STRIPE] Payment succeeded:", paymentIntent.id);
      // Create order in database with shipping address
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Use user ID if logged in, otherwise generate guest ID
        const userId = user?.id || generateGuestId();
        const orderNumber = generateOrderNumber();
        
        // Create order
        const { data: order, error: orderError } = await supabase
          .from('orders')
          .insert({
            user_id: userId,
            user_email: finalEmail,
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
      {/* Email - editable for guests, read-only for logged in users */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        {isGuest ? (
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        ) : (
          <Input
            id="email"
            type="email"
            value={userEmail}
            disabled
            className="bg-muted"
          />
        )}
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

      {/* Elements loading warning */}
      {elementsTimedOut && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Le formulaire de paiement ne se charge pas correctement</p>
            <p className="text-xs mt-1">Causes possibles : bloqueur de publicités, VPN, proxy d'entreprise, ou pare-feu bloquant Stripe.</p>
            <p className="text-xs mt-1">Essayez de désactiver vos extensions ou utilisez un autre navigateur/réseau.</p>
          </div>
        </div>
      )}

      {/* Loading indicator for elements */}
      {(!paymentReady || !addressReady) && !elementsTimedOut && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Chargement du formulaire sécurisé...</span>
        </div>
      )}

      {/* Shipping Address */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Adresse de livraison *
          {addressReady && <span className="text-xs text-green-600">✓</span>}
        </Label>
        <div className="p-4 bg-muted/50 rounded-lg">
          <AddressElement
            options={{
              mode: "shipping",
              allowedCountries: ["FR"],
              fields: {
                phone: "never",
              },
            }}
            onReady={handleAddressReady}
          />
        </div>
      </div>

      {/* Payment */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          Paiement *
          {paymentReady && <span className="text-xs text-green-600">✓</span>}
        </Label>
        <div className="p-4 bg-muted/50 rounded-lg">
          <PaymentElement
            options={{
              layout: "tabs",
            }}
            onReady={handlePaymentReady}
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

const LOADING_TIMEOUT_MS = 20000; // 20 seconds timeout

export const StripePaymentForm = ({ items, totalTTC, onSuccess, onCancel }: StripePaymentFormProps) => {
  // Calculate totalHT from items
  const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState<boolean | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Stripe loaded
  useEffect(() => {
    console.log("[STRIPE] Checking Stripe.js load status...");
    stripePromise.then((stripe) => {
      const loaded = stripe !== null;
      console.log("[STRIPE] Stripe.js loaded:", loaded);
      setStripeLoaded(loaded);
      if (!loaded) {
        setError("Stripe n'a pas pu être chargé. Vérifiez votre connexion internet ou désactivez votre bloqueur de publicités.");
        setIsLoading(false);
      }
    });
  }, []);

  // Create payment intent
  const createPaymentIntent = async () => {
    console.log("[STRIPE] Creating payment intent... (attempt:", retryCount + 1, ")");
    setIsLoading(true);
    setError(null);

    // Set timeout for loading
    timeoutRef.current = setTimeout(() => {
      console.error("[STRIPE] Payment intent creation timed out");
      setError("Le chargement prend trop de temps. Vérifiez votre connexion internet.");
      setIsLoading(false);
    }, LOADING_TIMEOUT_MS);

    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      console.log("[STRIPE] User check complete - logged in:", !!user?.email);
      
      if (user?.email) {
        setUserEmail(user.email);
        setIsGuest(false);
      } else {
        setIsGuest(true);
      }

      // Create payment intent - works for both guests and logged in users
      console.log("[STRIPE] Calling create-payment-intent edge function...");
      const { data, error: invokeError } = await supabase.functions.invoke("create-payment-intent", {
        body: { items, guestEmail: user?.email || undefined },
      });

      // Clear timeout on success
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      console.log("[STRIPE] Edge function response:", { 
        hasData: !!data, 
        hasClientSecret: !!data?.clientSecret,
        error: invokeError?.message || data?.error 
      });

      if (invokeError || data?.error) {
        throw new Error(data?.error || invokeError?.message || "Erreur lors de la création du paiement");
      }

      setClientSecret(data.clientSecret);
      console.log("[STRIPE] Payment intent created successfully");
    } catch (err) {
      // Clear timeout on error
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[STRIPE] Error creating payment intent:", message);
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

  useEffect(() => {
    // Only create payment intent if Stripe is loaded
    if (stripeLoaded === true) {
      createPaymentIntent();
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [stripeLoaded, retryCount]);

  const handleRetry = () => {
    console.log("[STRIPE] User clicked retry button");
    setRetryCount(prev => prev + 1);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Préparation du paiement...</p>
        <p className="text-xs text-muted-foreground/70">Si le chargement prend trop de temps, vérifiez votre connexion</p>
      </div>
    );
  }

  // Error state with retry option
  if (error || !clientSecret || stripeLoaded === false) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="h-12 w-12 text-destructive/70" />
        </div>
        <div className="space-y-2">
          <p className="text-destructive font-medium">Impossible de charger le formulaire de paiement</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {error || "Une erreur inattendue s'est produite"}
          </p>
          {stripeLoaded === false && (
            <p className="text-xs text-muted-foreground">
              Conseil: Désactivez votre bloqueur de publicités ou VPN si vous en utilisez un.
            </p>
          )}
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Retour au panier
          </Button>
          <Button onClick={handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
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
        isGuest={isGuest}
        setUserEmail={setUserEmail}
        onSuccess={onSuccess} 
        onCancel={onCancel} 
      />
    </Elements>
  );
};
