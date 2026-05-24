import { useState, useEffect, useRef, type ReactNode } from "react";
import type { Stripe } from "@stripe/stripe-js";
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
import { useTheme } from "@/contexts/ThemeContext";
import {
  resolvePublishableKey,
  getStripePromiseForPublishableKey,
  clearStripePromiseCache,
} from "@/lib/stripePublishableKey";
import { useSiteStripeMode, type SiteStripeMode } from "@/hooks/useSiteStripeMode";
import { StripeTestModeBanner } from "@/components/checkout/StripeTestModeBanner";

interface CheckoutFormProps {
  totalTTC: number;
  userEmail: string;
  isGuest: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

interface UserProfile {
  phone: string | null;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
}

interface CheckoutFormInnerProps extends CheckoutFormProps {
  items: CartItem[];
  totalHT: number;
  setUserEmail: (email: string) => void;
  userProfile: UserProfile | null;
  stripeMode: SiteStripeMode;
}

const ELEMENTS_READY_TIMEOUT_MS = 20000; // 20 seconds for elements to load

interface CheckoutFormInnerPropsWithFallback extends CheckoutFormInnerProps {
  onFallbackToCheckout: () => void;
  fallbackLoading: boolean;
}

const CheckoutForm = ({ totalTTC, userEmail, isGuest, onSuccess, onCancel, items, totalHT, setUserEmail, onFallbackToCheckout, fallbackLoading, userProfile, stripeMode }: CheckoutFormInnerPropsWithFallback) => {
  const { theme } = useTheme();
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phone, setPhone] = useState(userProfile?.phone || "");
  const [email, setEmail] = useState(userEmail);
  const guestEmailFromGate = isGuest && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((userEmail || "").trim());
  const [paymentReady, setPaymentReady] = useState(false);
  const [addressReady, setAddressReady] = useState(false);
  const [elementsTimedOut, setElementsTimedOut] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const elementsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const paymentReadyRef = useRef(false);
  const addressReadyRef = useRef(false);

  // Update phone when userProfile changes
  useEffect(() => {
    if (userProfile?.phone && !phone) {
      setPhone(userProfile.phone);
    }
  }, [userProfile]);

  useEffect(() => {
    if (guestEmailFromGate) setEmail(userEmail.trim());
  }, [guestEmailFromGate, userEmail]);

  // Log Stripe Elements status
  useEffect(() => {
    console.log("[STRIPE] CheckoutForm mounted - stripe:", !!stripe, "elements:", !!elements);
  }, [stripe, elements]);

  // Timeout for elements loading - only start when stripe/elements are available
  useEffect(() => {
    if (!stripe || !elements) return;
    
    console.log("[STRIPE] Starting elements ready timeout...");
    elementsTimeoutRef.current = setTimeout(() => {
      if (!paymentReadyRef.current || !addressReadyRef.current) {
        console.error("[STRIPE] Elements timed out - paymentReady:", paymentReadyRef.current, "addressReady:", addressReadyRef.current);
        setElementsTimedOut(true);
      }
    }, ELEMENTS_READY_TIMEOUT_MS);

    return () => {
      if (elementsTimeoutRef.current) {
        clearTimeout(elementsTimeoutRef.current);
      }
    };
  }, [stripe, elements]);

  // Clear timeout when both elements are ready
  useEffect(() => {
    if (paymentReady && addressReady && elementsTimeoutRef.current) {
      console.log("[STRIPE] Both elements ready, clearing timeout");
      clearTimeout(elementsTimeoutRef.current);
      elementsTimeoutRef.current = null;
      setElementsTimedOut(false);
    }
  }, [paymentReady, addressReady]);

  // Use both onReady and onChange to detect element readiness
  const handlePaymentReady = () => {
    console.log("[STRIPE] PaymentElement onReady fired");
    paymentReadyRef.current = true;
    setPaymentReady(true);
  };

  const handlePaymentChange = () => {
    // onChange fires when element is interactive - use as backup for onReady
    if (!paymentReadyRef.current) {
      console.log("[STRIPE] PaymentElement ready via onChange");
      paymentReadyRef.current = true;
      setPaymentReady(true);
    }
  };

  const handleAddressReady = () => {
    console.log("[STRIPE] AddressElement onReady fired");
    addressReadyRef.current = true;
    setAddressReady(true);
  };

  const handleAddressChange = () => {
    // onChange fires when element is interactive - use as backup for onReady
    if (!addressReadyRef.current) {
      console.log("[STRIPE] AddressElement ready via onChange");
      addressReadyRef.current = true;
      setAddressReady(true);
    }
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

    const resolvedGuestEmail = guestEmailFromGate ? userEmail.trim() : email.trim();
    if (isGuest && !resolvedGuestEmail) {
      setErrorMessage("Veuillez saisir votre adresse email");
      return;
    }

    if (isGuest && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedGuestEmail)) {
      setErrorMessage("Veuillez saisir une adresse email valide");
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    if (isGuest && !guestEmailFromGate) {
      setUserEmail(resolvedGuestEmail);
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

    const finalEmail = isGuest ? resolvedGuestEmail : userEmail;

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

        let orderSiteId: string | null = (theme?.site_id as string | undefined) ?? null;
        if (!orderSiteId) {
          const { data: siteRow } = await supabase
            .from("sites")
            .select("id")
            .eq("slug", SITE_SLUG)
            .eq("is_active", true)
            .maybeSingle();
          orderSiteId = (siteRow as { id?: string } | null)?.id ?? null;
        }

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
            notes: `Payment Intent: ${paymentIntent.id} | stripe_mode:${stripeMode}`,
            ...(orderSiteId ? { site_id: orderSiteId } : {}),
          })
          .select()
          .single();

        if (orderError) throw orderError;

        if (user?.id && phone.trim()) {
          await supabase
            .from("profiles")
            .update({ phone: phone.trim() })
            .eq("user_id", user.id);
        }

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
      {/* Email : une seule saisie (étape invité avant le formulaire) ; ici affichage seulement */}
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        {isGuest ? (
          guestEmailFromGate ? (
            <>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
                readOnly
              />
              <p className="text-xs text-muted-foreground">
                Adresse utilisée pour la confirmation de commande.
              </p>
            </>
          ) : (
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )
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

      {/* Elements loading warning with retry and fallback options */}
      {elementsTimedOut && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 dark:text-amber-400 text-sm space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">Le formulaire de paiement ne se charge pas correctement</p>
              <p className="text-xs mt-1">
                Votre antivirus (Kaspersky, Norton...), VPN ou proxy bloque probablement les éléments de paiement Stripe.
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </Button>
            <Button 
              type="button" 
              size="sm"
              onClick={onFallbackToCheckout}
              disabled={fallbackLoading}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {fallbackLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Redirection...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Payer sur page sécurisée Stripe
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-amber-600/80">
            La page sécurisée Stripe fonctionne même avec un antivirus actif.
          </p>
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
              defaultValues: userProfile?.shipping_address ? {
                name: userProfile.shipping_name || "",
                address: {
                  line1: userProfile.shipping_address || "",
                  line2: "",
                  city: userProfile.shipping_city || "",
                  postal_code: userProfile.shipping_postal_code || "",
                  country: "FR",
                },
              } : undefined,
            }}
            onReady={handleAddressReady}
            onChange={handleAddressChange}
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
              wallets: {
                applePay: "auto",
                googlePay: "auto",
              },
            }}
            onReady={handlePaymentReady}
            onChange={handlePaymentChange}
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
  /** Total TTC à encaisser (produits + frais de port le cas échéant) */
  totalTTC: number;
  /** Total HT commande (produits + port HT si frais appliqués) */
  totalHT: number;
  onSuccess: () => void;
  onCancel: () => void;
}

const LOADING_TIMEOUT_MS = 20000; // 20 seconds timeout

export const StripePaymentForm = ({ items, totalTTC, totalHT, onSuccess, onCancel }: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("");
  const [guestGateEmail, setGuestGateEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  const [sessionResolved, setSessionResolved] = useState(false);
  const [guestGatePassed, setGuestGatePassed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stripeLoaded, setStripeLoaded] = useState<boolean | null>(null);
  const { stripeMode } = useSiteStripeMode(true);
  const [stripePromiseState, setStripePromiseState] = useState<Promise<Stripe | null> | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [paymentEpoch, setPaymentEpoch] = useState(0);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevStripeModeRef = useRef<SiteStripeMode | null>(null);

  const pastGuestGate = !isGuest || guestGatePassed;
  const showStripeTestBanner = stripeMode === "test";

  const withStripeTestBanner = (node: ReactNode) => (
    <>
      {showStripeTestBanner && <StripeTestModeBanner />}
      {node}
    </>
  );

  // Fallback to Stripe Checkout hosted page
  const handleFallbackToCheckout = async () => {
    console.log("[STRIPE] Fallback to Stripe Checkout...");
    setFallbackLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const guestEmailBody =
        user?.email ?? (isGuest ? userEmail : undefined);

      const { data, error: invokeError } = await supabase.functions.invoke("create-stripe-checkout", {
        body: { items, guestEmail: guestEmailBody },
      });

      if (invokeError || data?.error) {
        throw new Error(data?.error || invokeError?.message || "Erreur lors de la création du paiement");
      }

      if (data?.url) {
        console.log("[STRIPE] Redirecting to Stripe Checkout:", data.url);
        window.location.href = data.url;
      } else {
        throw new Error("URL de paiement non reçue");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[STRIPE] Fallback error:", message);
      toast({
        title: "Erreur",
        description: message,
        variant: "destructive",
      });
      setFallbackLoading(false);
    }
  };

  // Auth / guest — independent of Stripe.js
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;

      if (user?.email) {
        setUserEmail(user.email);
        setIsGuest(false);
        setGuestGatePassed(true);

        const { data: profile } = await supabase
          .from("profiles")
          .select("phone, shipping_address, shipping_city, shipping_postal_code")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (profile) {
          setUserProfile({
            phone: profile.phone,
            shipping_name: user.user_metadata?.full_name || null,
            shipping_address: profile.shipping_address,
            shipping_city: profile.shipping_city,
            shipping_postal_code: profile.shipping_postal_code,
          });
        }
      } else {
        setIsGuest(true);
        setGuestGatePassed(false);
      }
      setSessionResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Si l’admin change `sites.stripe_mode` pendant la session : invalider Stripe.js, clientSecret et remonter Elements.
  useEffect(() => {
    if (stripeMode === null) return;
    const prev = prevStripeModeRef.current;
    if (prev !== null && prev !== stripeMode) {
      clearStripePromiseCache();
      setClientSecret(null);
      setStripeLoaded(null);
      setStripePromiseState(null);
      setError(null);
      setIsLoading(false);
      setPaymentEpoch((e) => e + 1);
    }
    prevStripeModeRef.current = stripeMode;
  }, [stripeMode]);

  useEffect(() => {
    if (stripeMode === null) return;
    const pk = resolvePublishableKey(stripeMode);
    if (!pk) {
      setStripeLoaded(false);
      setError(
        stripeMode === "test"
          ? "Clé publique Stripe test manquante (VITE_STRIPE_PUBLISHABLE_KEY_TEST ou VITE_STRIPE_PUBLISHABLE_KEY)."
          : "Clé publique Stripe live manquante (VITE_STRIPE_PUBLISHABLE_KEY_LIVE ou VITE_STRIPE_PUBLISHABLE_KEY).",
      );
      setStripePromiseState(null);
      return;
    }
    setError(null);
    const p = getStripePromiseForPublishableKey(pk);
    setStripePromiseState(p);
    p.then((stripe) => {
      const loaded = stripe !== null;
      setStripeLoaded(loaded);
      if (!loaded) {
        setError(
          "Stripe n'a pas pu être chargé. Vérifiez votre connexion internet ou désactivez votre bloqueur de publicités.",
        );
      }
    });
  }, [stripeMode]);

  // Create payment intent once Stripe + session + (guest email if applicable) are ready
  useEffect(() => {
    if (stripeMode === null || stripeLoaded !== true || !sessionResolved || !pastGuestGate) {
      return;
    }

    let cancelled = false;

    const createPaymentIntent = async () => {
      console.log("[STRIPE] Creating payment intent... (attempt:", retryCount + 1, ")");
      setIsLoading(true);
      setError(null);

      timeoutRef.current = setTimeout(() => {
        console.error("[STRIPE] Payment intent creation timed out");
        setError("Le chargement prend trop de temps. Vérifiez votre connexion internet.");
        setIsLoading(false);
      }, LOADING_TIMEOUT_MS);

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled) return;

        const guestEmailPayload = user?.email ?? (isGuest ? userEmail : undefined);

        console.log("[STRIPE] Calling create-payment-intent edge function...");
        const { data, error: invokeError } = await supabase.functions.invoke("create-payment-intent", {
          body: { items, guestEmail: guestEmailPayload },
        });

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (cancelled) return;

        console.log("[STRIPE] Edge function response:", {
          hasData: !!data,
          hasClientSecret: !!data?.clientSecret,
          error: invokeError?.message || data?.error,
        });

        if (invokeError || data?.error) {
          const details = invokeError && "details" in invokeError ? (invokeError as { details?: string }).details : undefined;
          const hint = invokeError && "hint" in invokeError ? (invokeError as { hint?: string }).hint : undefined;
          const composed =
            data?.error ||
            [invokeError?.message, details, hint].filter(Boolean).join(" - ") ||
            "Erreur lors de la création du paiement";
          throw new Error(composed);
        }

        setClientSecret(data.clientSecret);
        console.log("[STRIPE] Payment intent created successfully");
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (cancelled) return;

        const message = err instanceof Error ? err.message : "Erreur inconnue";
        console.error("[STRIPE] Error creating payment intent:", message);
        setError(message);
        toast({
          title: "Erreur",
          description: message,
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    createPaymentIntent();

    return () => {
      cancelled = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [stripeLoaded, stripeMode, sessionResolved, pastGuestGate, isGuest, userEmail, retryCount, paymentEpoch]);

  const submitGuestEmailGate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestGateEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({
        title: "Email invalide",
        description: "Indiquez une adresse email valide pour continuer vers le paiement.",
        variant: "destructive",
      });
      return;
    }
    setUserEmail(trimmed);
    setGuestGatePassed(true);
  };

  // Auto-trigger fallback when Stripe Elements fails to load (only after we attempted PI flow)
  const shouldFallback =
    stripeMode !== null &&
    sessionResolved &&
    pastGuestGate &&
    !isLoading &&
    (Boolean(error) || !clientSecret || stripeLoaded === false);

  useEffect(() => {
    if (shouldFallback && !fallbackLoading) {
      console.log("[STRIPE] Stripe Elements failed, auto-triggering Checkout fallback in 1.5s...");
      const autoFallbackTimer = setTimeout(() => {
        handleFallbackToCheckout();
      }, 1500);
      return () => clearTimeout(autoFallbackTimer);
    }
  }, [shouldFallback, fallbackLoading]);

  const handleRetry = () => {
    console.log("[STRIPE] User clicked retry button");
    setError(null);
    setClientSecret(null);
    setRetryCount((prev) => prev + 1);
  };

  if (!sessionResolved) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Vérification de la session…</p>
      </div>
    );
  }

  if (isGuest && !guestGatePassed) {
    return (
      <form onSubmit={submitGuestEmailGate} className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Pour un paiement sans compte, indiquez l&apos;email qui recevra la confirmation de commande.
        </p>
        <div className="space-y-2">
          <Label htmlFor="guest-gate-email">Email *</Label>
          <Input
            id="guest-gate-email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.fr"
            value={guestGateEmail}
            onChange={(e) => setGuestGateEmail(e.target.value)}
            required
          />
        </div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Retour au panier
          </Button>
          <Button type="submit" className="flex-1 btn-cart">
            Continuer vers le paiement
          </Button>
        </div>
      </form>
    );
  }

  if ((stripeMode === null || stripeLoaded === null) && !error) {
    return withStripeTestBanner(
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">
          {stripeMode === null ? "Chargement de la configuration Stripe…" : "Chargement du module de paiement…"}
        </p>
      </div>,
    );
  }

  if (isLoading) {
    return withStripeTestBanner(
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Préparation du paiement...</p>
        <p className="text-xs text-muted-foreground/70">Si le chargement prend trop de temps, vérifiez votre connexion</p>
      </div>,
    );
  }

  // Error state - auto-fallback to Stripe Checkout
  if (shouldFallback) {
    return withStripeTestBanner(
      <div className="text-center py-8 space-y-4">
        <div className="flex justify-center">
          {fallbackLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          )}
        </div>
        <div className="space-y-2">
          <p className="font-medium text-foreground">
            {fallbackLoading ? "Redirection vers la page de paiement sécurisée..." : "Formulaire intégré indisponible"}
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {fallbackLoading 
              ? "Vous allez être redirigé vers la page de paiement Stripe..."
              : "Votre antivirus, VPN ou bloqueur bloque le formulaire. Redirection automatique..."}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={onCancel}>
            Retour au panier
          </Button>
          {!fallbackLoading && (
            <>
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Réessayer ici
              </Button>
              <Button onClick={handleFallbackToCheckout} className="gap-2">
                <Lock className="h-4 w-4" />
                Aller à Stripe maintenant
              </Button>
            </>
          )}
        </div>
      </div>,
    );
  }

  if (!stripePromiseState) {
    return withStripeTestBanner(
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Initialisation Stripe…</p>
      </div>,
    );
  }

  if (!clientSecret) {
    return withStripeTestBanner(
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Préparation du paiement sécurisé…</p>
      </div>,
    );
  }

  return withStripeTestBanner(
    <Elements
      key={`stripe-elements-${stripeMode}-${paymentEpoch}`}
      stripe={stripePromiseState}
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
        stripeMode={stripeMode}
        userEmail={userEmail}
        isGuest={isGuest}
        setUserEmail={setUserEmail}
        onSuccess={onSuccess} 
        onCancel={onCancel}
        onFallbackToCheckout={handleFallbackToCheckout}
        fallbackLoading={fallbackLoading}
        userProfile={userProfile}
      />
    </Elements>,
  );
};
