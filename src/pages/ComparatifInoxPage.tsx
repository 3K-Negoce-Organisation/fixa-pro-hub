import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { buildOrganizationJsonLd } from "@/lib/organizationJsonLd";

const ComparatifInoxPage = () => {
  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.comparatifInox.title}
        description={STATIC_PAGE_SEO.comparatifInox.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.comparatifInox.path)}
        jsonLd={buildOrganizationJsonLd()}
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-4">Vis inox A2 vs A4</h1>
        <p className="text-muted-foreground mb-8 max-w-3xl">
          L’inox A2 convient à l’intérieur et à l’extérieur protégé. L’inox A4 résiste mieux à la
          corrosion (bord de mer, piscine, milieux agressifs). Choisissez A4 dès que
          l’environnement est corrosif.
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">En résumé</h2>
            <div className="overflow-x-auto not-prose">
              <table className="w-full border-collapse border border-border text-sm">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border p-3 text-left text-foreground">Critère</th>
                    <th className="border border-border p-3 text-left text-foreground">Inox A2</th>
                    <th className="border border-border p-3 text-left text-foreground">Inox A4</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      Résistance corrosion
                    </td>
                    <td className="border border-border p-3">Bonne (usage courant)</td>
                    <td className="border border-border p-3">Très bonne (milieux agressifs)</td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      Usages typiques
                    </td>
                    <td className="border border-border p-3">
                      Intérieur, extérieur abrité, menuiserie
                    </td>
                    <td className="border border-border p-3">
                      Bord de mer, piscine, atmosphère chlorée / saline
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-border p-3 font-medium text-foreground">
                      Vis à bois
                    </td>
                    <td className="border border-border p-3">Terrasse et extérieur standard</td>
                    <td className="border border-border p-3">
                      Terrasse exposée, zones côtières
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Quand choisir l’A2 ?</h2>
            <p className="text-muted-foreground">
              L’inox A2 (souvent 304) est le choix courant pour les vis à bois en intérieur ou en
              extérieur peu exposé aux embruns. Il offre une bonne tenue à la corrosion pour la
              majorité des projets de bricolage et de second œuvre.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Quand choisir l’A4 ?</h2>
            <p className="text-muted-foreground">
              L’inox A4 (souvent 316) contient du molybdène et résiste mieux aux chlorures. Pour une
              terrasse en bord de mer, une structure près d’une piscine ou un milieu chimique,
              privilégiez l’A4 afin de limiter la rouille et le piquage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-3">Et l’acier zingué ?</h2>
            <p className="text-muted-foreground">
              L’acier zingué / galvanisé reste adapté aux usages intérieurs et à de nombreux
              assemblages charpente (gammes type VBF). Pour un extérieur durable et humide,
              l’inox reste préférable.
            </p>
          </section>

          <section className="not-prose space-y-2">
            <p className="text-muted-foreground">
              Continuer :{" "}
              <Link to="/guide-choix-vis-a-bois" className="text-primary hover:underline">
                guide de choix des vis à bois
              </Link>
              {" · "}
              <Link to="/produits" className="text-primary hover:underline">
                catalogue
              </Link>
              {" · "}
              <Link to="/faq" className="text-primary hover:underline">
                FAQ
              </Link>
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </PageBackground>
  );
};

export default ComparatifInoxPage;
