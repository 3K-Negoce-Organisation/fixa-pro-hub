import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";

const CookiesPage = () => {
  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.cookies.title}
        description={STATIC_PAGE_SEO.cookies.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.cookies.path)}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-8">Politique de cookies</h1>
        
        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">1. Qu'est-ce qu'un cookie ?</h2>
            <p className="text-muted-foreground">
              Un cookie est un petit fichier texte déposé sur votre terminal (ordinateur, tablette, smartphone) lors de votre visite sur notre site. Il permet de stocker des informations relatives à votre navigation et de vous reconnaître lors de vos prochaines visites.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">2. Types de cookies utilisés</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-foreground">Cookies strictement nécessaires</h3>
                <p className="text-muted-foreground">
                  Ces cookies sont indispensables au fonctionnement du site. Ils vous permettent d'utiliser les fonctionnalités essentielles comme la navigation, l'accès aux zones sécurisées et la gestion de votre panier.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground">Cookies de performance</h3>
                <p className="text-muted-foreground">
                  Ces cookies collectent des informations sur la façon dont vous utilisez notre site (pages visitées, liens cliqués). Ils nous aident à améliorer le fonctionnement du site.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground">Cookies fonctionnels</h3>
                <p className="text-muted-foreground">
                  Ces cookies permettent de mémoriser vos choix (langue, région, préférences d'affichage) afin de vous offrir une expérience personnalisée.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-foreground">Cookies de ciblage/publicité</h3>
                <p className="text-muted-foreground">
                  Ces cookies sont utilisés pour vous proposer des publicités pertinentes. Ils permettent également de limiter le nombre de fois où vous voyez une publicité et d'évaluer l'efficacité des campagnes publicitaires.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">3. Liste des cookies utilisés</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left text-foreground">Nom</th>
                    <th className="border border-border p-3 text-left text-foreground">Finalité</th>
                    <th className="border border-border p-3 text-left text-foreground">Durée</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border p-3">sb-auth-token</td>
                    <td className="border border-border p-3">Authentification utilisateur</td>
                    <td className="border border-border p-3">Session</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">cart</td>
                    <td className="border border-border p-3">Sauvegarde du panier</td>
                    <td className="border border-border p-3">7 jours</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3">cookie_consent</td>
                    <td className="border border-border p-3">Mémorisation des préférences cookies</td>
                    <td className="border border-border p-3">13 mois</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">4. Gestion des cookies</h2>
            <p className="text-muted-foreground">
              Vous pouvez à tout moment choisir de désactiver les cookies en paramétrant votre navigateur. Voici comment procéder selon votre navigateur :
            </p>
            <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
              <li><strong>Chrome</strong> : Paramètres → Confidentialité et sécurité → Cookies</li>
              <li><strong>Firefox</strong> : Options → Vie privée et sécurité → Cookies</li>
              <li><strong>Safari</strong> : Préférences → Confidentialité → Cookies</li>
              <li><strong>Edge</strong> : Paramètres → Cookies et autorisations de site</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Attention : la désactivation de certains cookies peut affecter votre expérience de navigation et empêcher l'accès à certaines fonctionnalités du site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">5. Durée de conservation</h2>
            <p className="text-muted-foreground">
              Conformément à la réglementation, les cookies ont une durée de vie maximale de 13 mois. Au-delà de ce délai, votre consentement sera à nouveau requis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">6. Vos droits</h2>
            <p className="text-muted-foreground">
              Pour plus d'informations sur vos droits concernant vos données personnelles, consultez notre <a href="/politique-confidentialite" className="text-primary hover:underline">Politique de confidentialité</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">7. Contact</h2>
            <p className="text-muted-foreground">
              Pour toute question concernant notre utilisation des cookies, contactez-nous à : contact@vis-a-bois.com
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default CookiesPage;
