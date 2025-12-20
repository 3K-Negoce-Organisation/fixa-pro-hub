import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
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
  onSuccess: () => void;
  onCancel: () => void;
}

const CheckoutForm = ({ totalTTC, onSuccess, onCancel }: CheckoutFormProps) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clearCart } = useCart();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/confirmation`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message || "Une erreur est survenue");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      toast({
        title: "Paiement réussi !",
        description: "Votre commande a été confirmée.",
      });
      clearCart();
      onSuccess();
      navigate(`/confirmation?payment_intent=${paymentIntent.id}`);
    } else {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-muted/50 rounded-lg">
        <PaymentElement 
          options={{
            layout: "tabs",
          }}
        />
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
  onSuccess: () => void;
  onCancel: () => void;
}

export const StripePaymentForm = ({ items, totalTTC, onSuccess, onCancel }: StripePaymentFormProps) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const createPaymentIntent = async () => {
      try {
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
          },
        },
        locale: "fr",
      }}
    >
      <CheckoutForm totalTTC={totalTTC} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
};
