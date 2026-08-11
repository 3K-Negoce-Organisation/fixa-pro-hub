import { DEFAULT_STOREFRONT_SITE_SLUG } from "@/lib/storefrontSite";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import MarketplaceHomePage from "./MarketplaceHomePage";
import VisABoisHomePage from "./VisABoisHomePage";

/**
 * Accueil : catalogue Vis-à-Bois (hero + grille catégories) pour le slug historique,
 * sinon marketplace 3K-Négoce (univers / home_visual).
 */
const Index = () => {
  const { siteSlug } = useStorefrontSite();
  const slug = siteSlug || DEFAULT_STOREFRONT_SITE_SLUG;

  if (slug === "vis-a-bois") {
    return <VisABoisHomePage />;
  }

  return <MarketplaceHomePage />;
};

export default Index;
