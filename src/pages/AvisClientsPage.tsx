import { Link } from "react-router-dom";
import { MessageSquare, Star } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { Button } from "@/components/ui/button";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";

/**
 * Page « Avis clients » — levier de confiance du plan com.
 * Contenu enrichi au fil de l'eau (avis Google, retours chantier, etc.).
 */
const AvisClientsPage = () => {
  const seo = STATIC_PAGE_SEO.avisClients;

  return (
    <PageBackground>
      <PageSeo
        title={seo.title}
        description={seo.description}
        canonical={staticPageCanonical(seo.path)}
      />
      <Header />
      <main className="flex-1">
        <div className="container py-10 md:py-14 max-w-3xl">
          <div className="flex items-center gap-2 mb-2">
            <Star className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Avis clients</h1>
          </div>
          <p className="text-muted-foreground mb-8 max-w-2xl">
            La confiance se construit chantier après chantier. Cette page accueillera progressivement
            vos retours d&apos;expérience — artisans, charpentiers et bricoleurs.
          </p>

          <section className="rounded-lg border border-border bg-card p-6 md:p-8 mb-8">
            <h2 className="text-lg font-semibold mb-2">Partagez votre expérience</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Vous avez commandé chez Vis-à-Bois ? Votre avis aide d&apos;autres professionnels et
              particuliers à choisir les bonnes fixations. Merci de prendre une minute pour témoigner.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-accent hover:bg-accent/90">
                <Link to="/contact?sujet=avis">
                  <Star className="h-4 w-4 mr-2" />
                  Laisser un avis
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/contact">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Nous écrire
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Les avis Google Business Profile pourront aussi être reliés ici dès que le lien officiel
              sera configuré.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Témoignages</h2>
            <p className="text-sm text-muted-foreground">
              Les avis publiés ici seront ajoutés au fil de l&apos;eau. En attendant, découvrez nos
              conseils pratiques sur le{" "}
              <Link to="/blog" className="text-primary underline underline-offset-2">
                blog Vis-à-Bois
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

export default AvisClientsPage;
