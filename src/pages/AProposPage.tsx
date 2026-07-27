import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { buildOrganizationJsonLd } from "@/lib/organizationJsonLd";

const AProposPage = () => {
  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.aPropos.title}
        description={STATIC_PAGE_SEO.aPropos.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.aPropos.path)}
        jsonLd={buildOrganizationJsonLd()}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">À propos de Vis-à-Bois</h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Vis-à-Bois est la boutique en ligne de <strong className="text-foreground">3K-Négoce</strong>,
          spécialisée dans les vis à bois pour particuliers et professionnels. Plus de 5000
          références en stock, fiches techniques PDF, livraison en France métropolitaine.
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Notre spécialité</h2>
            <p className="text-muted-foreground">
              Terrasse, charpente, agglo, tirefond : nous sélectionnons des gammes professionnelles
              (dont VBF, VBHT, références terrasse Torx) pour des chantiers fiables. Commandez en
              ligne sur{" "}
              <a href="https://www.vis-a-bois.com" className="text-primary hover:underline">
                vis-a-bois.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Éditeur</h2>
            <p className="text-muted-foreground">
              <strong className="text-foreground">3K-Négoce</strong> — SAS
              <br />
              Siège : 47 rue Vivienne, 75002 Paris
              <br />
              SIREN : 102 662 483 — TVA : FR45102662483
              <br />
              Téléphone :{" "}
              <a href="tel:0617912029" className="text-primary hover:underline">
                06 17 91 20 29
              </a>
              <br />
              Email :{" "}
              <a href="mailto:contact@vis-a-bois.com" className="text-primary hover:underline">
                contact@vis-a-bois.com
              </a>
            </p>
            <p className="text-muted-foreground mt-2">
              Détails légaux :{" "}
              <Link to="/mentions-legales" className="text-primary hover:underline">
                mentions légales
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Ressources utiles</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <Link to="/guide-choix-vis-a-bois" className="text-primary hover:underline">
                  Guide : comment choisir ses vis à bois
                </Link>
              </li>
              <li>
                <Link to="/comparatif-vis-inox-a2-a4" className="text-primary hover:underline">
                  Comparatif inox A2 vs A4
                </Link>
              </li>
              <li>
                <Link to="/information-technique" className="text-primary hover:underline">
                  Fiches techniques
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-primary hover:underline">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-primary hover:underline">
                  Contact
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default AProposPage;
