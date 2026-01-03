import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const PolitiqueConfidentialitePage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Politique de confidentialité</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          {/* Section 1 - Objet */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Objet</h2>
            <p className="text-muted-foreground">
              La présente politique de confidentialité a pour objet d'informer les utilisateurs du site internet 
              vis-a-bois.fr (ci-après le « Site ») et les clients de Vis à Bois (ci-après la « Société ») de la 
              manière dont leurs données personnelles sont collectées et traitées, conformément au Règlement (UE) 
              2016/679 du 27 avril 2016 relatif à la protection des personnes physiques à l'égard du traitement 
              des données à caractère personnel (RGPD) et à la loi n° 78-17 du 6 janvier 1978 modifiée dite 
              « Informatique et Libertés ».
            </p>
          </section>

          {/* Section 2 - Responsable de traitement */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Responsable de traitement</h2>
            <p className="text-muted-foreground">
              Le responsable du traitement des données personnelles collectées dans le cadre du Site et des 
              activités commerciales est :
            </p>
            <div className="text-muted-foreground mt-4">
              <p><strong>Vis à Bois</strong></p>
              <p>Société par Actions Simplifiée (SAS) au capital de [à compléter] euros</p>
              <p>Siège social : [à compléter]</p>
              <p>Immatriculée au Registre du Commerce et des Sociétés de [à compléter] sous le numéro [à compléter]</p>
              <p>Numéro de TVA intracommunautaire : [à compléter]</p>
              <p className="mt-2">Email : contact@vis-a-bois.fr</p>
              <p>Téléphone : [à compléter]</p>
            </div>
          </section>

          {/* Section 3 - Données personnelles collectées */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Données personnelles collectées</h2>
            <p className="text-muted-foreground mb-4">
              La Société peut être amenée à collecter les catégories de données suivantes :
            </p>

            <div className="space-y-4 ml-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.1 Données d'identification et de contact</h3>
                <p className="text-muted-foreground">
                  Nom, prénom, adresse email, numéro de téléphone, et pour les professionnels : raison sociale, 
                  numéro SIRET, fonction au sein de l'entreprise.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.2 Données de commande et de facturation</h3>
                <p className="text-muted-foreground">
                  Historique des commandes, détail des produits achetés, adresse de facturation, numéro de client.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.3 Données de paiement</h3>
                <p className="text-muted-foreground">
                  Les paiements sont traités par un prestataire externe sécurisé (Stripe). La Société ne conserve 
                  pas les numéros de carte bancaire. Seules les informations permettant d'identifier la transaction 
                  (référence de paiement, montant, date) sont conservées.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.4 Données de livraison</h3>
                <p className="text-muted-foreground">
                  Adresse de livraison, instructions de livraison, informations relatives au suivi des colis.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.5 Données de navigation et techniques</h3>
                <p className="text-muted-foreground">
                  Adresse IP, type de navigateur, pages visitées, durée de visite, données de connexion au compte 
                  client. Ces données sont notamment collectées via des cookies (voir notre Politique Cookies).
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">3.6 Données liées à la prospection commerciale</h3>
                <p className="text-muted-foreground">
                  Consentement à la réception de communications commerciales, historique des communications envoyées, 
                  préférences marketing.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 - Finalités et bases légales */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Finalités et bases légales des traitements</h2>
            <p className="text-muted-foreground mb-4">
              Les données personnelles collectées sont traitées pour les finalités suivantes :
            </p>

            <div className="space-y-4 ml-4">
              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.1 Exécution du contrat</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Gestion des commandes (traitement, expédition, suivi)</li>
                  <li>Gestion de la relation client (service après-vente, réclamations)</li>
                  <li>Gestion du compte client</li>
                  <li>Facturation et comptabilité</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.2 Respect des obligations légales</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Conservation des factures et documents comptables</li>
                  <li>Réponse aux demandes des autorités compétentes</li>
                  <li>Lutte contre la fraude</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.3 Intérêt légitime de la Société</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Amélioration des services et du Site</li>
                  <li>Analyse statistique de la fréquentation</li>
                  <li>Prévention des impayés</li>
                  <li>Gestion des contentieux</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-foreground mb-2">4.4 Consentement</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Envoi de communications commerciales et newsletters</li>
                  <li>Dépôt de cookies non essentiels</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 5 - Destinataires des données */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Destinataires des données</h2>
            <p className="text-muted-foreground mb-2">
              Les données personnelles peuvent être communiquées aux destinataires suivants :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Les services internes de la Société (commercial, logistique, comptabilité, service client)</li>
              <li>Les prestataires de paiement (Stripe)</li>
              <li>Les transporteurs et prestataires logistiques</li>
              <li>Les prestataires techniques (hébergement, maintenance du Site)</li>
              <li>Les autorités administratives ou judiciaires lorsque la loi l'exige</li>
            </ul>
          </section>

          {/* Section 6 - Sous-traitants et transferts */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Sous-traitants et transferts hors Union européenne</h2>
            <p className="text-muted-foreground mb-4">
              Certains de nos prestataires peuvent être établis en dehors de l'Union européenne. Dans ce cas, la 
              Société s'assure que ces transferts sont encadrés par des garanties appropriées conformément au RGPD :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Décision d'adéquation de la Commission européenne</li>
              <li>Clauses contractuelles types de la Commission européenne</li>
              <li>Règles d'entreprise contraignantes (BCR)</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Vous pouvez obtenir une copie des garanties mises en place en nous contactant à l'adresse 
              contact@vis-a-bois.fr.
            </p>
          </section>

          {/* Section 7 - Durées de conservation */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Durées de conservation</h2>
            <p className="text-muted-foreground mb-2">
              Les données personnelles sont conservées pendant les durées suivantes :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li><strong>Données clients :</strong> pendant la durée de la relation commerciale, puis 3 ans à compter de la dernière commande pour les besoins de prospection commerciale</li>
              <li><strong>Données de facturation :</strong> 10 ans à compter de la clôture de l'exercice comptable (obligation légale)</li>
              <li><strong>Données de navigation :</strong> 13 mois maximum pour les cookies</li>
              <li><strong>Données de prospection :</strong> 3 ans à compter du dernier contact ou jusqu'au retrait du consentement</li>
              <li><strong>Données liées aux contentieux :</strong> jusqu'à résolution définitive du litige</li>
            </ul>
          </section>

          {/* Section 8 - Droits des personnes */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">8. Droits des personnes</h2>
            <p className="text-muted-foreground mb-4">
              Conformément à la réglementation applicable, vous disposez des droits suivants concernant vos données 
              personnelles :
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li><strong>Droit d'accès :</strong> obtenir la confirmation que des données vous concernant sont traitées et en obtenir une copie</li>
              <li><strong>Droit de rectification :</strong> demander la correction de données inexactes ou incomplètes</li>
              <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données dans les cas prévus par la loi</li>
              <li><strong>Droit d'opposition :</strong> vous opposer au traitement de vos données pour des motifs légitimes, ou à la prospection commerciale</li>
              <li><strong>Droit à la limitation :</strong> demander la suspension du traitement de vos données dans certains cas</li>
              <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré et couramment utilisé</li>
              <li><strong>Droit de retirer votre consentement :</strong> à tout moment pour les traitements fondés sur le consentement</li>
              <li><strong>Droit de définir des directives post-mortem :</strong> relatives à la conservation, l'effacement et la communication de vos données après votre décès</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Pour exercer ces droits, vous pouvez nous contacter par email à contact@vis-a-bois.fr ou par courrier 
              à l'adresse du siège social. Une pièce d'identité pourra vous être demandée.
            </p>
            <p className="text-muted-foreground mt-2">
              Ces droits sont également accessibles depuis votre espace client, rubrique « Vie privée & RGPD ».
            </p>
          </section>

          {/* Section 9 - Réclamations */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">9. Réclamations et voies de recours</h2>
            <p className="text-muted-foreground">
              Si vous estimez que le traitement de vos données personnelles n'est pas conforme à la réglementation 
              applicable, vous pouvez introduire une réclamation auprès de la Commission Nationale de l'Informatique 
              et des Libertés (CNIL) :
            </p>
            <div className="text-muted-foreground mt-4 ml-4">
              <p>CNIL</p>
              <p>3 Place de Fontenoy</p>
              <p>TSA 80715</p>
              <p>75334 Paris Cedex 07</p>
              <p className="mt-2">Site internet : <a href="https://www.cnil.fr" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">www.cnil.fr</a></p>
            </div>
            <p className="text-muted-foreground mt-4">
              Vous pouvez également vous adresser à l'autorité de contrôle de tout autre État membre de l'Union 
              européenne.
            </p>
          </section>

          {/* Section 10 - Sécurité des données */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">10. Sécurité des données</h2>
            <p className="text-muted-foreground">
              La Société met en œuvre les mesures techniques et organisationnelles appropriées pour assurer la 
              sécurité des données personnelles et les protéger contre tout accès non autorisé, perte, altération 
              ou divulgation. Ces mesures incluent notamment :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li>Le chiffrement des données sensibles et des communications (SSL/TLS)</li>
              <li>La sécurisation des accès aux systèmes d'information</li>
              <li>La sauvegarde régulière des données</li>
              <li>La sensibilisation du personnel à la protection des données</li>
            </ul>
          </section>

          {/* Section 11 - Mise à jour */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">11. Mise à jour de la politique</h2>
            <p className="text-muted-foreground">
              La présente politique de confidentialité peut être modifiée à tout moment pour tenir compte des 
              évolutions légales, réglementaires ou des pratiques de la Société. La version en vigueur est celle 
              accessible sur le Site. En cas de modification substantielle, les utilisateurs seront informés par 
              tout moyen approprié.
            </p>
            <p className="text-muted-foreground mt-4">
              <strong>Dernière mise à jour :</strong> Janvier 2025
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PolitiqueConfidentialitePage;
