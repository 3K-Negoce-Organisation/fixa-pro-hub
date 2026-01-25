import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { Link } from "react-router-dom";

const LivraisonPage = () => {
  return (
    <PageBackground>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Livraison</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Zones de livraison</h2>
            <p className="text-muted-foreground">
              Nous livrons actuellement en <strong>France métropolitaine</strong> uniquement.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour les livraisons vers les <strong>DOM-TOM</strong> ou <strong>l'étranger</strong>, merci de nous contacter directement à contact@vis-a-bois.fr ou au 06 17 91 20 29 pour obtenir un devis personnalisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Frais de livraison</h2>
            <p className="text-muted-foreground">
              <strong>Livraison offerte</strong> pour toute commande d'un montant supérieur ou égal à <strong>125€ HT</strong>.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour les commandes inférieures à ce montant, les frais de livraison sont calculés en fonction du poids et du volume de votre commande. Le montant exact vous est indiqué avant la validation de votre commande.
            </p>
            <div className="overflow-x-auto mt-4">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left text-foreground">Montant de la commande</th>
                    <th className="border border-border p-3 text-left text-foreground">Frais de livraison</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border p-3">Moins de 125€ HT</td>
                    <td className="border border-border p-3">Selon poids et volume</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">125€ HT et plus</td>
                    <td className="border border-border p-3">Gratuit</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Transporteurs</h2>
            <p className="text-muted-foreground">
              Nous travaillons avec des transporteurs de confiance pour garantir la livraison de vos commandes dans les meilleures conditions :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-2">
              <li><strong>DPD Classic</strong> : Livraison à domicile sans rendez-vous (2-4 jours ouvrés)</li>
              <li><strong>DPD Predict</strong> : Livraison à domicile avec créneau horaire précis par SMS</li>
              <li><strong>DPD Pickup</strong> : Livraison en point relais de votre choix</li>
              <li><strong>Colissimo</strong> : Livraison à domicile par La Poste</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Le choix du transporteur peut varier selon le poids et les dimensions de votre commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Délais de livraison</h2>
            <p className="text-muted-foreground">
              Les délais de livraison sont généralement de <strong>3 à 7 jours ouvrés</strong> à compter de la confirmation de votre commande.
            </p>
            <p className="text-muted-foreground mt-2">
              Ces délais sont donnés à titre indicatif et peuvent varier en fonction de :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>La disponibilité des produits commandés</li>
              <li>La zone géographique de livraison</li>
              <li>Les périodes de forte activité (fêtes, soldes)</li>
              <li>Les éventuels aléas du transporteur</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              En cas de retard exceptionnel, nous vous informerons par email dans les meilleurs délais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Suivi de commande</h2>
            <p className="text-muted-foreground">
              Dès l'expédition de votre commande, vous recevez un email de confirmation contenant votre <strong>numéro de suivi</strong>.
            </p>
            <p className="text-muted-foreground mt-2">
              Vous pouvez suivre l'acheminement de votre colis directement sur le site du transporteur ou depuis votre espace client sur notre site, dans la section <Link to="/suivi" className="text-primary hover:underline">Suivi de commande</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Réception et réclamation</h2>
            <p className="text-muted-foreground">
              À la réception de votre colis, nous vous recommandons de :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Vérifier l'état extérieur du colis en présence du livreur</li>
              <li>En cas de dommage apparent, <strong>émettre des réserves précises</strong> sur le bon de livraison</li>
              <li>Ouvrir le colis et vérifier le contenu</li>
              <li>En cas de produit manquant ou endommagé, nous contacter sous 48h</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>Important</strong> : En l'absence de réserves émises à la réception, aucune réclamation relative à l'état du colis ne pourra être acceptée.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour toute réclamation, contactez-nous à contact@vis-a-bois.fr en joignant :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Votre numéro de commande</li>
              <li>Des photos du colis et des produits endommagés</li>
              <li>Une description du problème</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant la livraison, contactez-nous :
            </p>
            <ul className="list-none text-muted-foreground mt-2 space-y-1">
              <li>Email : <a href="mailto:contact@vis-a-bois.fr" className="text-primary hover:underline">contact@vis-a-bois.fr</a></li>
              <li>Téléphone : 06 17 91 20 29</li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default LivraisonPage;
