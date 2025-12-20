import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const PolitiqueConfidentialitePage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Politique de confidentialité</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Introduction</h2>
            <p className="text-muted-foreground">
              La société Vis à Bois attache une grande importance à la protection de vos données personnelles. Cette politique de confidentialité décrit comment nous collectons, utilisons et protégeons vos informations personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Responsable du traitement</h2>
            <p className="text-muted-foreground">
              Le responsable du traitement des données personnelles est :<br />
              <strong>Vis à Bois</strong><br />
              Adresse : [À compléter]<br />
              Email : contact@vis-a-bois.fr<br />
              Téléphone : 03 88 XX XX XX
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Données collectées</h2>
            <p className="text-muted-foreground">
              Nous collectons les données suivantes :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Données d'identification : nom, prénom, adresse email, numéro de téléphone</li>
              <li>Données professionnelles : raison sociale, SIRET, adresse de facturation et livraison</li>
              <li>Données de navigation : cookies, adresse IP, pages visitées</li>
              <li>Données de transaction : historique des commandes, moyens de paiement</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Finalités du traitement</h2>
            <p className="text-muted-foreground">
              Vos données personnelles sont collectées pour les finalités suivantes :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Gestion de votre compte client</li>
              <li>Traitement et suivi de vos commandes</li>
              <li>Facturation et comptabilité</li>
              <li>Service après-vente et support client</li>
              <li>Envoi de communications commerciales (avec votre consentement)</li>
              <li>Amélioration de nos services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Base légale du traitement</h2>
            <p className="text-muted-foreground">
              Le traitement de vos données repose sur :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>L'exécution du contrat pour le traitement des commandes</li>
              <li>Votre consentement pour les communications marketing</li>
              <li>Notre intérêt légitime pour l'amélioration de nos services</li>
              <li>Nos obligations légales pour la conservation des factures</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Durée de conservation</h2>
            <p className="text-muted-foreground">
              Vos données sont conservées pendant :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>3 ans après votre dernière activité pour les données de compte</li>
              <li>10 ans pour les données de facturation (obligation légale)</li>
              <li>13 mois maximum pour les cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Vos droits</h2>
            <p className="text-muted-foreground">
              Conformément au RGPD, vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Droit d'accès à vos données</li>
              <li>Droit de rectification</li>
              <li>Droit à l'effacement ("droit à l'oubli")</li>
              <li>Droit à la limitation du traitement</li>
              <li>Droit à la portabilité des données</li>
              <li>Droit d'opposition</li>
              <li>Droit de retirer votre consentement</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Pour exercer ces droits, contactez-nous à : contact@vis-a-bois.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Sécurité des données</h2>
            <p className="text-muted-foreground">
              Nous mettons en œuvre toutes les mesures techniques et organisationnelles appropriées pour garantir un niveau de sécurité adapté au risque, notamment le chiffrement des données, la sécurisation des accès et la sauvegarde régulière des données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Contact et réclamation</h2>
            <p className="text-muted-foreground">
              Pour toute question relative à cette politique ou pour exercer vos droits, contactez-nous à contact@vis-a-bois.fr.<br /><br />
              Vous avez également le droit d'introduire une réclamation auprès de la CNIL (Commission Nationale de l'Informatique et des Libertés) : www.cnil.fr
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PolitiqueConfidentialitePage;
