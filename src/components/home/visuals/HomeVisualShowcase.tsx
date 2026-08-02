import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlogSidebar } from "@/components/home/BlogSidebar";
import { QuickOrderSection } from "@/components/home/QuickOrderSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { UniversGrid } from "@/components/home/UniversGrid";
import { MarketplaceTrustStrip } from "@/components/home/MarketplaceTrustStrip";
import { PageSeo } from "@/components/seo/PageSeo";
import { useMarketplaceHome } from "@/hooks/useMarketplaceHome";
import {
  MARKETPLACE_HOME_DESCRIPTION,
  MARKETPLACE_HOME_TITLE,
} from "@/lib/homeVisuals";
import { absoluteUrl } from "@/lib/seo";

/** 11eVisuel — hero + miniatures + catégories paysage. */
export function HomeVisualShowcase() {
  const { univers } = useMarketplaceHome();
  const hero = univers.find((u) => u.active && u.imageUrl) ?? univers[0];
  const thumbs = univers.filter((u) => u.slug !== hero?.slug).slice(0, 4);

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#000d4f]">
      <PageSeo
        title={MARKETPLACE_HOME_TITLE}
        description={MARKETPLACE_HOME_DESCRIPTION}
        canonical={absoluteUrl("/")}
      />
      <Header />
      <main className="flex-1">
        <section className="container py-6 md:py-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,280px)]">
            <div className="relative min-h-[320px] overflow-hidden rounded-[var(--theme-border-radius,0)] bg-[#000d4f] md:min-h-[420px]">
              {hero?.imageUrl && (
                <img
                  src={hero.imageUrl}
                  alt={hero.name}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#000d4f]/90 via-[#000d4f]/55 to-transparent" />
              <div className="relative z-10 flex h-full flex-col justify-center gap-4 p-6 text-white md:p-10">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-orange)]">
                  3K-Négoce · Marketplace
                </p>
                <h1 className="max-w-xl text-3xl font-extrabold tracking-tight md:text-5xl">
                  Un négoce, {univers.length || 8} univers spécialisés
                </h1>
                <p className="max-w-md text-white/75">
                  Fixation et outillage — une vitrine, un checkout.
                </p>
                <div>
                  <Button
                    asChild
                    className="theme-radius h-11 bg-[var(--brand-orange)] px-5 font-bold text-[#000d4f] hover:bg-[var(--brand-orange-hover)]"
                  >
                    <Link to="/produits">
                      Voir le catalogue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-rows-4 gap-2">
              {thumbs.map((item) => (
                <Link
                  key={item.slug}
                  to={item.active ? `/produits?gamme=${encodeURIComponent(item.slug)}` : "#"}
                  className="relative overflow-hidden rounded-[var(--theme-border-radius,0)] bg-[#e8ecf3]"
                  aria-disabled={!item.active}
                  onClick={(e) => {
                    if (!item.active) e.preventDefault();
                  }}
                >
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-black/55 px-2 py-1.5 text-xs font-semibold text-white">
                    {item.name}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="container pb-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 className="text-lg font-bold md:text-xl">Nos univers</h2>
            <div className="w-full max-w-[300px] lg:w-[300px]">
              <BlogSidebar tone="marketplaceBlue" />
            </div>
          </div>
          <UniversGrid
            univers={univers}
            columns="grid-cols-2 md:grid-cols-4"
            aspect="aspect-[16/10]"
          />
        </section>

        <div className="container py-5 md:py-8">
          <div className="theme-frame bg-[rgba(0,13,79,0.04)] p-4 md:p-6">
            <QuickOrderSection />
            <FeaturedProducts />
          </div>
        </div>
        <MarketplaceTrustStrip />
      </main>
      <Footer />
    </div>
  );
}
