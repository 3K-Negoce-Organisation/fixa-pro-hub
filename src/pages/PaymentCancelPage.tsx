import { useEffect } from "react";
import { Link } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const PAYMENT_CHANNEL = "payment-status";

const PaymentCancelPage = () => {
  // Notify the original page that payment was cancelled
  useEffect(() => {
    const channel = new BroadcastChannel(PAYMENT_CHANNEL);
    channel.postMessage({ status: "cancelled" });
    channel.close();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container py-16">
        <div className="max-w-lg mx-auto text-center space-y-6">
          <div className="flex justify-center">
            <XCircle className="h-20 w-20 text-destructive" />
          </div>

          <h1 className="text-3xl font-bold">Paiement annulé</h1>

          <p className="text-muted-foreground">
            Votre paiement a été annulé. Aucun montant n'a été débité de votre compte.
          </p>

          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">
              Votre panier a été conservé. Vous pouvez reprendre votre commande à tout moment.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button asChild>
              <Link to="/panier">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour au panier
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

export default PaymentCancelPage;
