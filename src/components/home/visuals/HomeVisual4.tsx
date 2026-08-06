import { Link } from "react-router-dom";
import { ArrowRight, Shield, Truck } from "lucide-react";
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
import { cn } from "@/lib/utils";

type HomeVisual4Props = {
  /** 13eVisuel : même layout, bannière hero plus basse. */
  compactHero?: boolean;
};

export function HomeVisual4({ compactHero = false }: HomeVisual4Props) {
  const { univers } = useMarketplaceHome();

  return (
    <div className="flex min-h-screen flex-col bg-white text-[#000d4f]">
      <PageSeo
        title={MARKETPLACE_HOME_TITLE}
        description={MARKETPLACE_HOME_DESCRIPTION}
        canonical={absoluteUrl("/")}
      />
      <Header />
      <main className="marketplace-v4 relative flex-1">
        <section className="relative overflow-hidden bg-[#000d4f] text-white">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 70% 80% at 0% 50%, rgba(255,121,0,0.22), transparent 55%), #000d4f",
            }}
            aria-hidden
          />
          <div
            className={cn(
              "container relative z-10",
              // 4e: py-8 / md:py-12 — 13e: moitié exacte
              compactHero ? "py-4 md:py-6" : "py-8 md:py-12",
            )}
          >
            <div className="mx-auto max-w-3xl animate-in fade-in slide-in-from-bottom-3 text-center duration-700">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-orange)] md:text-xs">
                3K-Négoce · Marketplace
              </p>
              <h1 className="mb-4 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                Un négoce, {univers.length || 8} univers spécialisés
              </h1>
              <p className="mx-auto mb-7 max-w-xl text-sm text-white/70 md:text-base">
                Fixation et outillage — une vitrine, un checkout.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  className="theme-radius h-11 bg-[var(--brand-orange)] px-5 font-bold text-[#000d4f] hover:bg-[var(--brand-orange-hover)]"
                >
                  <Link to="/produits">
                    Voir le catalogue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="theme-radius h-11 border-white/35 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/auth">Créer un compte</Link>
                </Button>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                  <Truck className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
                  Livraison 24/48h
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
                  <Shield className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
                  25 ans d&apos;expérience dans le domaine de la fixation
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="container py-6 md:py-8">
          <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,380px)]">
            <div className="animate-in fade-in duration-700">
              <div className="mb-3 flex items-end justify-between gap-3">
                <h2 className="text-lg font-bold md:text-xl">Nos univers</h2>
                <Link
                  to="/produits"
                  className="text-sm font-semibold text-[#000d4f]/70 transition-colors hover:text-[var(--brand-orange)]"
                >
                  Tout le catalogue
                </Link>
              </div>
              <UniversGrid
                univers={univers}
                columns="grid-cols-2 sm:grid-cols-4"
                aspect="aspect-[4/3] sm:aspect-square"
              />
            </div>
            <div className="min-h-0 animate-in fade-in slide-in-from-right-4 delay-75 duration-700">
              <BlogSidebar tone="marketplaceBlue" fillHeight />
            </div>
          </div>
        </section>

        <div className="container py-5 md:py-8">
          <div className="theme-frame bg-[rgba(0,13,79,0.04)] p-4 text-[#000d4f] md:p-6">
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

export function HomeVisual13() {
  return <HomeVisual4 compactHero />;
}
