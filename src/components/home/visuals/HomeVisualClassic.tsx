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

type ClassicVariant = "1erVisuel" | "2eVisuel" | "3eVisuel";

function HeroCopy({
  universCount,
  stackedButtons,
}: {
  universCount: number;
  stackedButtons?: boolean;
}) {
  return (
    <>
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand-orange)] md:text-xs">
        3K-Négoce · Marketplace
      </p>
      <h1 className="mb-3 text-2xl font-extrabold leading-[1.12] tracking-tight sm:text-3xl">
        Un négoce, {universCount || 8} univers spécialisés
      </h1>
      <p className="mb-5 text-sm leading-relaxed text-white/75">
        Fixation et outillage — une vitrine, un checkout.
      </p>
      <div className={cn("mb-5 gap-2.5", stackedButtons ? "flex flex-col" : "flex flex-wrap")}>
        <Button
          asChild
          className="theme-radius h-10 w-full bg-[var(--brand-orange)] px-4 font-bold text-[#000d4f] hover:bg-[var(--brand-orange-hover)] sm:w-auto"
        >
          <Link to="/produits">
            Voir le catalogue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="theme-radius h-10 w-full border-white/35 bg-transparent px-4 text-white hover:bg-white/10 hover:text-white sm:w-auto"
        >
          <Link to="/auth">Créer un compte</Link>
        </Button>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
          <Truck className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
          <span>Livraison 24/48h</span>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15">
          <Shield className="h-3.5 w-3.5 text-[var(--brand-orange)]" />
          <span>25 ans d&apos;expérience dans le domaine de la fixation</span>
        </div>
      </div>
    </>
  );
}

export function HomeVisualClassic({ variant }: { variant: ClassicVariant }) {
  const { univers } = useMarketplaceHome();
  const isNavyPage = variant === "1erVisuel";
  const isStackedHero = variant === "2eVisuel";

  return (
    <div
      className={cn(
        "flex min-h-screen flex-col",
        isNavyPage ? "bg-[#000d4f] text-white" : "bg-white text-[#000d4f]",
      )}
    >
      <PageSeo
        title={MARKETPLACE_HOME_TITLE}
        description={MARKETPLACE_HOME_DESCRIPTION}
        canonical={absoluteUrl("/")}
      />
      <Header />
      <main
        className={cn(
          "relative flex-1",
          variant === "1erVisuel" && "marketplace-2026",
          variant === "2eVisuel" && "marketplace-v2",
          variant === "3eVisuel" && "marketplace-v3",
        )}
      >
        {!isNavyPage && (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000d4f' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
            aria-hidden
          />
        )}

        <section className="relative z-10">
          {isStackedHero ? (
            <div className="container space-y-5 py-6 md:space-y-6 md:py-8">
              <div className="grid items-stretch gap-4 md:gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]">
                <div className="theme-frame animate-in fade-in slide-in-from-bottom-3 bg-[#000d4f] p-5 text-white duration-700 md:p-7">
                  <HeroCopy universCount={univers.length} />
                </div>
                <div className="min-h-0 animate-in fade-in slide-in-from-right-4 delay-75 duration-700">
                  <BlogSidebar tone="marketplaceBlue" fillHeight />
                </div>
              </div>
              <div className="animate-in fade-in duration-700">
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 className="text-lg font-bold md:text-xl">Nos univers</h2>
                  <Link
                    to="/produits"
                    className="text-sm font-semibold text-[#000d4f]/70 hover:text-[var(--brand-orange)]"
                  >
                    Tout le catalogue
                  </Link>
                </div>
                <UniversGrid
                  univers={univers}
                  columns="grid-cols-2 sm:grid-cols-4"
                  aspect="aspect-square"
                />
              </div>
            </div>
          ) : (
            <div className="container grid items-stretch gap-5 py-6 md:py-8 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)_minmax(300px,380px)] lg:gap-6">
              <div
                className={cn(
                  "animate-in fade-in slide-in-from-bottom-3 duration-700",
                  variant === "3eVisuel" && "theme-frame bg-[#000d4f] p-5 text-white md:p-6",
                  variant === "1erVisuel" && "lg:pt-1",
                )}
              >
                <HeroCopy universCount={univers.length} stackedButtons />
              </div>
              <div className="min-h-0 animate-in fade-in duration-700">
                <UniversGrid
                  univers={univers}
                  columns="grid-cols-4"
                  aspect="aspect-square"
                  className="h-full gap-2 sm:gap-2.5"
                />
              </div>
              <div className="min-h-0 animate-in fade-in slide-in-from-right-4 delay-150 duration-700">
                <BlogSidebar tone="marketplaceBlue" fillHeight />
              </div>
            </div>
          )}
        </section>

        <div className="relative z-10 container py-5 md:py-8">
          <div
            className={cn(
              "theme-frame p-4 md:p-6",
              isNavyPage ? "bg-white text-[#000d4f]" : "bg-[rgba(0,13,79,0.04)] text-[#000d4f]",
            )}
          >
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
