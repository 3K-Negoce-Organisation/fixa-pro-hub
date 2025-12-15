import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { useCart } from "@/contexts/CartContext";

const OrderConfirmationPage = () => {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  // Clear cart on successful checkout return
  useEffect(() => {
    clearCart();
  }, [clearCart]);

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
            Merci pour votre commande. Vous recevrez un email de confirmation de Shopify avec les détails de votre achat.
          </p>

          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Package className="h-5 w-5" />
              <span>Votre commande est en cours de traitement</span>
            </div>

            <p className="text-sm text-muted-foreground">
              Vous pouvez suivre l'état de votre commande depuis votre espace client ou via le lien dans l'email de confirmation.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild>
              <Link to="/produits">
                Continuer mes achats
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/compte">
                Mon compte
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
