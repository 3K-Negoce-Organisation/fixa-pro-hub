import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { TECHNICAL_SHEETS } from "@/lib/technicalSheets";
import { useSiteCategories, filterHomepageCategories } from "@/hooks/useSiteCategories";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { DEFAULT_STOREFRONT_SITE_SLUG } from "@/lib/storefrontSite";

export function SeoExploreLinks() {
  const { siteSlug } = useStorefrontSite();
  const { data: categories = [] } = useSiteCategories("id, name, slug, show_on_homepage, image_url");
  const homepageCategories = filterHomepageCategories(categories);
  const isVisABois = siteSlug === DEFAULT_STOREFRONT_SITE_SLUG;

  if (categories.length === 0 && !isVisABois) {
    return null;
  }

  return (
    <section className="py-8 border-t border-border" aria-labelledby="seo-explore-heading">
      <h2 id="seo-explore-heading" className="text-lg font-semibold text-foreground mb-2">
        {isVisABois ? "Explorer nos vis à bois professionnelles" : "Explorer le catalogue"}
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
        {isVisABois
          ? "Parcourez nos gammes par usage ou téléchargez les fiches techniques PDF pour vos chantiers."
          : "Parcourez nos gammes par catégorie."}
      </p>

      {homepageCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {homepageCategories.map((cat) => (
            <Link
              key={cat.id}
              to={`/produits?category=${cat.slug}`}
              className="inline-flex items-center rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              {cat.name}
            </Link>
          ))}
          <Link
            to="/produits"
            className="inline-flex items-center rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Tout le catalogue
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      )}

      {isVisABois && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">Fiches techniques vis à bois</h3>
          </div>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm">
            {TECHNICAL_SHEETS.map((sheet) => (
              <li key={sheet.id}>
                <Link
                  to="/information-technique"
                  className="text-muted-foreground hover:text-primary transition-colors"
                >
                  {sheet.title}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/information-technique"
            className="inline-flex items-center mt-3 text-sm font-medium text-primary hover:underline"
          >
            Voir toutes les fiches techniques
            <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Link>
        </div>
      )}
    </section>
  );
}
