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
  type AiryHomeTheme,
} from "@/lib/homeVisuals";
import { absoluteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export function HomeVisualAiry({ theme }: { theme: AiryHomeTheme }) {
  const { univers } = useMarketplaceHome();
  const heroUnivers = univers.find((u) => u.active && u.imageUrl) ?? univers[0];
  const fullBleed = theme.heroLayout === "fullBleed";
  const universColumns = theme.universColumns ?? "grid-cols-2 sm:grid-cols-4";

  const style = {
    ["--mh-page" as string]: theme.pageBg,
    ["--mh-text" as string]: theme.text,
    ["--mh-muted" as string]: theme.muted,
    ["--mh-accent" as string]: theme.accent,
    ["--mh-accent-hover" as string]: theme.accentHover,
    ["--mh-accent-contrast" as string]: theme.accentContrast,
    ["--mh-nav" as string]: theme.navBar,
    ["--mh-nav-text" as string]: theme.navText,
    ["--mh-hero" as string]: theme.heroBg,
    ["--mh-tile" as string]: theme.tileBg,
    ["--mh-tile-text" as string]: theme.tileText,
    backgroundColor: theme.pageBg,
    color: theme.text,
  };

  return (
    <div className="marketplace-airy flex min-h-screen flex-col" style={style}>
      <PageSeo
        title={MARKETPLACE_HOME_TITLE}
        description={MARKETPLACE_HOME_DESCRIPTION}
        canonical={absoluteUrl("/")}
      />
      <Header />
      <main className="flex-1">
        <div className="h-1 w-full" style={{ backgroundColor: "var(--mh-accent)" }} aria-hidden />

        {fullBleed ? (
          <section className="relative w-full overflow-hidden">
            <div className="relative min-h-[420px] w-full md:min-h-[520px] lg:min-h-[560px]">
              {heroUnivers?.imageUrl ? (
                <img
                  src={heroUnivers.imageUrl}
                  alt={heroUnivers.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0" style={{ backgroundColor: "var(--mh-accent)" }} />
              )}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(0,13,79,0.88) 0%, rgba(0,13,79,0.55) 42%, rgba(0,13,79,0.2) 70%, transparent 100%)",
                }}
                aria-hidden
              />
              <div className="container relative z-10 grid min-h-[420px] items-stretch gap-6 py-10 md:min-h-[520px] md:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] md:gap-8 md:py-14 lg:min-h-[560px]">
                <div className="flex animate-in fade-in slide-in-from-bottom-3 flex-col justify-center space-y-5 text-white duration-700">
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--brand-orange)] md:text-xs">
                    3K-Négoce · Marketplace
                  </p>
                  <h1 className="max-w-xl text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
                    Un négoce, {univers.length || 8} univers spécialisés
                  </h1>
                  <p className="max-w-md text-base leading-relaxed text-white/80">
                    Fixation et outillage — une vitrine claire, un checkout.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button
                      asChild
                      className="theme-radius h-11 bg-[var(--brand-orange)] px-6 font-bold text-[#000d4f] hover:bg-[var(--brand-orange-hover)]"
                    >
                      <Link to="/produits">
                        Voir le catalogue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="theme-radius h-11 border-white/35 bg-transparent px-6 text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link to="/auth">Créer un compte</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex min-h-0 animate-in fade-in slide-in-from-right-4 delay-75 duration-700 md:justify-end">
                  <div className="w-full md:max-w-[340px]">
                    <BlogSidebar tone="marketplace" fillHeight />
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          <section style={{ backgroundColor: "var(--mh-hero)" }}>
            <div className="container grid items-center gap-10 py-12 md:grid-cols-2 md:gap-16 md:py-16 lg:gap-20">
              <div className="animate-in fade-in slide-in-from-bottom-3 space-y-5 duration-700">
                <p
                  className="text-[11px] font-bold uppercase tracking-[0.2em] md:text-xs"
                  style={{ color: "var(--mh-accent)" }}
                >
                  3K-Négoce · Marketplace
                </p>
                <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight sm:text-4xl md:text-5xl">
                  Un négoce, {univers.length || 8} univers spécialisés
                </h1>
                <p className="max-w-md text-base leading-relaxed" style={{ color: "var(--mh-muted)" }}>
                  Fixation et outillage — une vitrine claire, un checkout.
                </p>
                <div className="flex flex-wrap gap-3 pt-1">
                  <Button
                    asChild
                    className="theme-radius h-11 px-6 font-bold"
                    style={{
                      backgroundColor: "var(--mh-accent)",
                      color: "var(--mh-accent-contrast)",
                    }}
                  >
                    <Link to="/produits">
                      Voir le catalogue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="theme-radius h-11 px-6"
                    style={{ borderColor: "var(--mh-text)", color: "var(--mh-text)" }}
                  >
                    <Link to="/auth">Créer un compte</Link>
                  </Button>
                </div>
              </div>
              <div className="min-h-0 animate-in fade-in slide-in-from-right-4 delay-75 duration-700">
                <BlogSidebar tone="marketplace" fillHeight />
              </div>
            </div>
          </section>
        )}

        <section className="container py-10 md:py-14">
          <div className="mb-6 flex items-end justify-between gap-3">
            <h2 className="text-xl font-bold md:text-2xl">Nos univers</h2>
            <Link
              to="/produits"
              className="text-sm font-semibold transition-colors hover:opacity-80"
              style={{ color: "var(--mh-accent)" }}
            >
              Tout le catalogue
            </Link>
          </div>
          <UniversGrid
            univers={univers}
            columns={universColumns}
            aspect={cn(
              theme.universColumns ? "aspect-square" : "aspect-[4/5] sm:aspect-[5/6]",
            )}
            labelPlacement="below"
            className={theme.universColumns ? "gap-2 sm:gap-3" : undefined}
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
