import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";

const OrderConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { clearCart } = useCart();

  // Clear cart on successful payment
  useEffect(() => {
    if (sessionId) {
      clearCart();
    }
  }, [sessionId, clearCart]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-16">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle className="h-20 w-20 text-green-500" />
          </div>

          <h1 className="text-3xl font-bold">Commande confirmée !</h1>

          <p className="text-muted-foreground">
            Merci pour votre commande. Vous recevrez un email de confirmation avec les détails de votre achat.
          </p>

          {sessionId && (
            <p className="text-sm text-muted-foreground">
              Référence de paiement : <code className="bg-muted px-2 py-1 rounded">{sessionId.slice(0, 20)}...</code>
            </p>
          )}

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Package className="h-5 w-5" />
              <span>Votre commande est en cours de traitement</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Livraison estimée : 24-48h. Vous recevrez un email avec le numéro de suivi dès l'expédition.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild>
              <Link to="/suivi">
                Suivre ma commande
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/produits">
                Continuer mes achats
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderConfirmationPage;
