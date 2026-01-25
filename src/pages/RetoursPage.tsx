import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { Link } from "react-router-dom";

const RetoursPage = () => {
  return (
    <PageBackground>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Retours et échanges</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Droit de rétractation</h2>
            <p className="text-muted-foreground">
              Conformément à l'article L.221-18 du Code de la consommation, vous disposez d'un délai de <strong>14 jours</strong> à compter de la réception de votre commande pour exercer votre droit de rétractation, sans avoir à justifier de motif.
            </p>
            <p className="text-muted-foreground mt-2">
              Ce délai court à compter du jour de la réception du dernier produit de votre commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Conditions de retour</h2>
            <p className="text-muted-foreground">
              Pour être acceptés, les produits retournés doivent :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Être dans leur <strong>état d'origine</strong>, non utilisés et non endommagés</li>
              <li>Être retournés dans leur <strong>emballage d'origine</strong>, intact</li>
              <li>Être accompagnés de tous les accessoires et notices éventuels</li>
              <li>Être renvoyés dans un délai de 14 jours suivant la notification de rétractation</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              <strong>Attention</strong> : Les produits ayant été utilisés, ouverts (pour les boîtes de vis par exemple), abîmés ou incomplets ne pourront faire l'objet d'un remboursement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Procédure de retour</h2>
            <p className="text-muted-foreground">
              Pour effectuer un retour, suivez ces étapes :
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-2">
              <li>
                <strong>Notifiez votre intention de retour</strong> par email à contact@vis-a-bois.fr en indiquant :
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                  <li>Votre numéro de commande</li>
                  <li>Les produits concernés par le retour</li>
                  <li>Le motif du retour (facultatif)</li>
                </ul>
              </li>
              <li>
                <strong>Attendez notre confirmation</strong> avec les instructions de retour et l'adresse d'expédition
              </li>
              <li>
                <strong>Emballez soigneusement</strong> les produits dans leur emballage d'origine
              </li>
              <li>
                <strong>Expédiez le colis</strong> à vos frais, en conservant la preuve d'envoi
              </li>
            </ol>
            <p className="text-muted-foreground mt-4">
              <strong>Important</strong> : Les frais de retour sont à votre charge, sauf en cas de produit défectueux ou erreur de notre part.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Remboursement</h2>
            <p className="text-muted-foreground">
              Le remboursement sera effectué dans un délai de <strong>14 jours</strong> suivant :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>La réception des produits retournés, ou</li>
              <li>La preuve d'expédition du retour (la première de ces deux dates)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Le remboursement comprend :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Le prix des produits retournés</li>
              <li>Les frais de livraison initiaux (si retour de la commande complète)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Le remboursement sera effectué par le même moyen de paiement que celui utilisé lors de la commande.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Échanges</h2>
            <p className="text-muted-foreground">
              Si vous souhaitez échanger un produit contre un autre, vous devez :
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-1">
              <li>Effectuer une demande de retour selon la procédure ci-dessus</li>
              <li>Passer une nouvelle commande pour le produit souhaité</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              Nous ne procédons pas à des échanges directs. Le remboursement de votre première commande sera effectué dès réception du retour.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Produits défectueux</h2>
            <p className="text-muted-foreground">
              Si vous recevez un produit défectueux ou non conforme à votre commande :
            </p>
            <ol className="list-decimal list-inside text-muted-foreground mt-2 space-y-2">
              <li>Contactez-nous dans les <strong>48 heures</strong> suivant la réception</li>
              <li>Envoyez-nous des <strong>photos</strong> du produit défectueux</li>
              <li>Nous vous proposerons un remplacement ou un remboursement</li>
            </ol>
            <p className="text-muted-foreground mt-4">
              Dans ce cas, les <strong>frais de retour seront pris en charge</strong> par nos soins. Un bon de retour prépayé vous sera envoyé par email.
            </p>
            <p className="text-muted-foreground mt-2">
              Vous bénéficiez également de la <strong>garantie légale de conformité</strong> (2 ans) et de la <strong>garantie contre les vices cachés</strong>. Pour plus de détails, consultez nos <Link to="/cgv" className="text-primary hover:underline">Conditions Générales de Vente</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant les retours, contactez-nous :
            </p>
            <ul className="list-none text-muted-foreground mt-2 space-y-1">
              <li>Email : <a href="mailto:contact@vis-a-bois.fr" className="text-primary hover:underline">contact@vis-a-bois.fr</a></li>
              <li>Téléphone : 06 17 91 20 29</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Notre équipe vous répondra dans les meilleurs délais pour vous accompagner dans votre démarche.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default RetoursPage;
