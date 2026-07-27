import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { buildOrganizationJsonLd } from "@/lib/organizationJsonLd";

const GuideChoixVisPage = () => {
  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.guideChoix.title}
        description={STATIC_PAGE_SEO.guideChoix.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.guideChoix.path)}
        jsonLd={buildOrganizationJsonLd()}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Comment choisir ses vis à bois
        </h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          Pour choisir une vis à bois adaptée, retenez d’abord l’usage (terrasse, charpente, agglo,
          tirefond), puis le matériau (acier zingué, inox A2 ou inox A4), le diamètre et la longueur.
          Vis-à-Bois propose plus de 5000 références en stock avec livraison 24/48h en France
          métropolitaine.
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">1. Définir l’usage</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>
                <strong className="text-foreground">Terrasse</strong> — vis inox ou traitées pour
                l’extérieur, souvent empreinte Torx ; voir{" "}
                <Link to="/produits?category=terrasse" className="text-primary hover:underline">
                  vis terrasse
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">Charpente / ossature</strong> — gammes type VBF
                (tête fraisée galvanisée) pour assemblages structurels ; voir{" "}
                <Link to="/produits?category=charpente" className="text-primary hover:underline">
                  vis charpente
                </Link>
                .
              </li>
              <li>
                <strong className="text-foreground">Agglo / panneaux</strong> — diamètres plus fins
                pour MDF, OSB et ameublement.
              </li>
              <li>
                <strong className="text-foreground">Tirefond</strong> — tête hexagonale (VBHT) pour
                charges lourdes et serrage à clé.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">2. Choisir le matériau</h2>
            <p className="text-muted-foreground">
              L’acier zingué convient en intérieur ou extérieur peu exposé. L’inox A2 convient en
              intérieur et extérieur protégé. L’inox A4 est recommandé en bord de mer, piscine ou
              milieu agressif. Détail :{" "}
              <Link to="/comparatif-vis-inox-a2-a4" className="text-primary hover:underline">
                comparatif inox A2 vs A4
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">
              3. Diamètre et longueur
            </h2>
            <p className="text-muted-foreground">
              En règle générale, la longueur de la vis doit pénétrer suffisamment dans le support
              porteur (souvent au moins la moitié de l’épaisseur pour un assemblage bois sur bois,
              selon le projet). Le diamètre suit la charge et le type de bois. Filtrez dans le{" "}
              <Link to="/produits" className="text-primary hover:underline">
                catalogue
              </Link>{" "}
              par diamètre et longueur, ou consultez les{" "}
              <Link to="/information-technique" className="text-primary hover:underline">
                fiches techniques PDF
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">4. Empreinte et tête</h2>
            <p className="text-muted-foreground">
              Torx limite le cam-out sur les chantiers. Tête fraisée pour un affleurement propre ;
              tête hexagonale pour les tirefonds. Le conditionnement (boîtes) est indiqué sur chaque
              fiche produit.
            </p>
          </section>

          <section className="rounded-lg border border-border bg-muted/40 p-6 not-prose">
            <h2 className="text-lg font-semibold text-foreground mb-2">Besoin d’un conseil ?</h2>
            <p className="text-muted-foreground mb-3">
              Contactez-nous au{" "}
              <a href="tel:0617912029" className="text-primary hover:underline">
                06 17 91 20 29
              </a>{" "}
              ou via la{" "}
              <Link to="/contact" className="text-primary hover:underline">
                page contact
              </Link>
              . Voir aussi la{" "}
              <Link to="/faq" className="text-primary hover:underline">
                FAQ
              </Link>
              .
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default GuideChoixVisPage;
