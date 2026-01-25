import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { Link } from "react-router-dom";

const CGVPage = () => {
  return (
    <PageBackground>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">Conditions Générales de Vente</h1>
        <p className="text-muted-foreground mb-8">En vigueur au 25/01/2025</p>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Objet et champ d'application</h2>
            <p className="text-muted-foreground">
              Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre :
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Luceka</strong> (exploitant la marque Vis à Bois)<br />
              Société par actions simplifiée (SAS)<br />
              Capital social : 2 000 euros<br />
              SIREN : 818 228 637<br />
              TVA intracommunautaire : FR43818228637<br />
              Siège social : 345 chemin de l'Espero, 13090 Aix-en-Provence<br />
              Email : contact@vis-a-bois.fr<br />
              Téléphone : 06 17 91 20 29
            </p>
            <p className="text-muted-foreground mt-2">
              Ci-après dénommée "le Vendeur", et toute personne physique ou morale passant commande sur le site vis-a-bois.fr, ci-après dénommée "le Client".
            </p>
            <p className="text-muted-foreground mt-2">
              Toute commande passée sur le site implique l'acceptation sans réserve des présentes CGV par le Client.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Produits</h2>
            <p className="text-muted-foreground">
              Les produits proposés à la vente sont ceux figurant sur le site vis-a-bois.fr au jour de la consultation par le Client. Le Vendeur s'efforce de présenter les caractéristiques essentielles des produits (description, photos, dimensions, matériaux).
            </p>
            <p className="text-muted-foreground mt-2">
              Les photographies illustrant les produits n'entrent pas dans le champ contractuel et ne sauraient engager la responsabilité du Vendeur. Les produits sont conformes à la législation française en vigueur.
            </p>
            <p className="text-muted-foreground mt-2">
              Les offres de produits sont valables dans la limite des stocks disponibles. En cas d'indisponibilité d'un produit après passation de la commande, le Client sera informé par email dans les meilleurs délais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Prix</h2>
            <p className="text-muted-foreground">
              Les prix sont indiqués en euros toutes taxes comprises (TTC), incluant la TVA au taux en vigueur (20%). Les frais de livraison ne sont pas inclus dans le prix des produits et sont indiqués avant la validation de la commande.
            </p>
            <p className="text-muted-foreground mt-2">
              Le Vendeur se réserve le droit de modifier ses prix à tout moment, étant entendu que le prix figurant sur le site le jour de la commande sera le seul applicable au Client.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Livraison offerte</strong> : La livraison est offerte pour toute commande d'un montant supérieur ou égal à 125€ HT (hors promotions spécifiques).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Commandes</h2>
            <p className="text-muted-foreground">
              Le Client sélectionne les produits qu'il souhaite commander et les ajoute à son panier. Après vérification du contenu de son panier, le Client valide sa commande en cliquant sur le bouton de validation.
            </p>
            <p className="text-muted-foreground mt-2">
              La validation de la commande implique l'acceptation intégrale des présentes CGV, la reconnaissance d'en avoir parfaite connaissance et la renonciation à se prévaloir de ses propres conditions d'achat.
            </p>
            <p className="text-muted-foreground mt-2">
              Un email de confirmation récapitulant les détails de la commande est envoyé au Client. Le Vendeur se réserve le droit d'annuler toute commande pour motif légitime (erreur de prix, stock insuffisant, etc.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Paiement</h2>
            <p className="text-muted-foreground">
              Le paiement s'effectue en ligne par carte bancaire (Visa, Mastercard) via la plateforme sécurisée Stripe. Le paiement est débité immédiatement lors de la validation de la commande.
            </p>
            <p className="text-muted-foreground mt-2">
              Les données de paiement sont transmises de manière sécurisée et cryptée. Le Vendeur n'a pas accès aux informations bancaires du Client.
            </p>
            <p className="text-muted-foreground mt-2">
              En cas de paiement refusé, la commande sera automatiquement annulée et le Client en sera informé par email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Livraison</h2>
            <p className="text-muted-foreground">
              Les produits sont livrés à l'adresse indiquée par le Client lors de la commande. La livraison est effectuée en France métropolitaine uniquement. Pour les DOM-TOM et l'étranger, merci de nous contacter.
            </p>
            <p className="text-muted-foreground mt-2">
              Les délais de livraison sont de 3 à 7 jours ouvrés à compter de la confirmation de la commande. Ces délais sont donnés à titre indicatif et peuvent varier selon la disponibilité des produits et le transporteur.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour plus d'informations sur les modalités de livraison, consultez notre page <Link to="/livraison" className="text-primary hover:underline">Livraison</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Droit de rétractation</h2>
            <p className="text-muted-foreground">
              Conformément à l'article L.221-18 du Code de la consommation, le Client dispose d'un délai de <strong>14 jours</strong> à compter de la réception des produits pour exercer son droit de rétractation, sans avoir à justifier de motifs ni à payer de pénalités.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour exercer ce droit, le Client doit notifier sa décision de rétractation au Vendeur par email à contact@vis-a-bois.fr ou par courrier à l'adresse du siège social, en indiquant clairement son intention de se rétracter.
            </p>
            <p className="text-muted-foreground mt-2">
              Les frais de retour sont à la charge du Client. Les produits doivent être retournés dans leur état et emballage d'origine, non utilisés et non endommagés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Retours et remboursements</h2>
            <p className="text-muted-foreground">
              En cas de rétractation, le Vendeur remboursera le Client de la totalité des sommes versées, y compris les frais de livraison (à l'exception des frais supplémentaires si le Client a choisi un mode de livraison plus coûteux que le mode standard).
            </p>
            <p className="text-muted-foreground mt-2">
              Le remboursement sera effectué dans un délai de 14 jours à compter de la réception des produits retournés ou de la preuve d'expédition, en utilisant le même moyen de paiement que celui utilisé pour la commande.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour connaître la procédure détaillée, consultez notre page <Link to="/retours" className="text-primary hover:underline">Retours</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Garanties légales</h2>
            <p className="text-muted-foreground">
              Tous les produits bénéficient de la garantie légale de conformité (articles L.217-4 à L.217-14 du Code de la consommation) et de la garantie contre les vices cachés (articles 1641 à 1649 du Code civil).
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Garantie de conformité</strong> : Le Client dispose d'un délai de 2 ans à compter de la délivrance du bien pour agir. Il peut choisir entre la réparation ou le remplacement du bien, sous réserve des conditions de coût prévues par l'article L.217-9 du Code de la consommation.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Garantie des vices cachés</strong> : Le Client peut demander la résolution de la vente ou une réduction du prix conformément à l'article 1644 du Code civil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Responsabilité</h2>
            <p className="text-muted-foreground">
              Le Vendeur ne saurait être tenu responsable de l'inexécution du contrat en cas de force majeure, de perturbation ou grève des services postaux ou moyens de transport, de rupture de stock, de catastrophes naturelles, d'incendie ou d'inondation.
            </p>
            <p className="text-muted-foreground mt-2">
              La responsabilité du Vendeur est limitée au montant de la commande. Le Vendeur ne pourra être tenu responsable des dommages indirects résultant de l'utilisation des produits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Protection des données personnelles</h2>
            <p className="text-muted-foreground">
              Les données personnelles collectées lors de la commande sont nécessaires au traitement de celle-ci et sont traitées conformément au Règlement Général sur la Protection des Données (RGPD).
            </p>
            <p className="text-muted-foreground mt-2">
              Le Client dispose d'un droit d'accès, de rectification, de suppression et de portabilité de ses données. Pour exercer ces droits ou pour toute question relative au traitement des données, le Client peut contacter le Vendeur à contact@vis-a-bois.fr.
            </p>
            <p className="text-muted-foreground mt-2">
              Pour plus d'informations, consultez notre <Link to="/politique-confidentialite" className="text-primary hover:underline">Politique de confidentialité</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">12. Droit applicable et litiges</h2>
            <p className="text-muted-foreground">
              Les présentes CGV sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire.
            </p>
            <p className="text-muted-foreground mt-2">
              <strong>Médiation</strong> : Conformément aux articles L.612-1 et suivants du Code de la consommation, le Client peut recourir gratuitement au service de médiation proposé par le Vendeur. Le médiateur peut être saisi à l'adresse suivante : [médiateur à désigner].
            </p>
            <p className="text-muted-foreground mt-2">
              À défaut de résolution amiable, les tribunaux compétents seront ceux du ressort de la Cour d'appel d'Aix-en-Provence.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default CGVPage;
