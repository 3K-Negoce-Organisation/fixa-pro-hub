import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Shield, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { CategoryCard } from "@/components/home/CategoryCard";
import { QuickOrderSection } from "@/components/home/QuickOrderSection";
import { SeoExploreLinks } from "@/components/home/SeoExploreLinks";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BlogSidebar } from "@/components/home/BlogSidebar";
import { PageSeo } from "@/components/seo/PageSeo";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { useSiteCategories, filterHomepageCategories } from "@/hooks/useSiteCategories";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import heroScrewsBg from "@/assets/hero-screws-new.jpg";
import screwsDetailLeft from "@/assets/screws-detail-left-optimized.jpg";
import screwsDetailRight from "@/assets/screws-detail-right-optimized.jpg";

// Preload critical images
const preloadImages = [heroScrewsBg, screwsDetailLeft, screwsDetailRight];
preloadImages.forEach((src) => {
  const img = new Image();
  img.src = src;
});

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const navigate = useNavigate();
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const { data: dbCategories = [] } = useSiteCategories();

  // Track image loading state
  useEffect(() => {
    let loadedCount = 0;
    const totalImages = preloadImages.length;
    
    preloadImages.forEach((src) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.src = src;
    });
    
    // Fallback: consider loaded after 2s max
    const timeout = setTimeout(() => setImagesLoaded(true), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Fetch product counts by category_id (scoped to active site)
  const { data: categoryCounts } = useQuery({
    queryKey: ["category-counts", siteId],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true);
      if (siteId) q = q.eq("site_id", siteId);
      const { data, error } = await q;
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((product) => {
        if (product.category_id) {
          counts[product.category_id] = (counts[product.category_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !siteLoading,
  });

  const categories = filterHomepageCategories(dbCategories).map((cat) => ({
    ...cat,
    count: categoryCounts?.[cat.id] || 0,
  }));

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produits?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <PageBackground>
      <PageSeo
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        canonical={absoluteUrl("/")}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
          description: DEFAULT_DESCRIPTION,
          potentialAction: {
            "@type": "SearchAction",
            target: {
              "@type": "EntryPoint",
              urlTemplate: `${SITE_URL}/produits?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />

      <main className="flex-1 relative">
        {/* Fond hero plein largeur derrière la zone haute */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] md:h-[32rem] bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url(${heroScrewsBg})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] md:h-[32rem] bg-gradient-to-b from-transparent via-background/30 to-background"
          aria-hidden
        />

        {/* Contenu dès sous le header : colonne principale à gauche, blog à droite */}
        <div className="container relative z-10 pt-4 md:pt-6 pb-10">
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 xl:gap-8 lg:items-start">
            <div className="min-w-0">
              {/* Hero Search */}
              <section className="py-6 md:py-10">
                <div className="flex items-center justify-center gap-4 lg:gap-8">
                  {/* Left decorative image - hidden on mobile */}
                  <div className="hidden md:block flex-shrink-0">
                    <div className={`w-28 lg:w-36 h-28 lg:h-36 rounded-2xl overflow-hidden shadow-xl ring-4 ring-primary/20 rotate-[-6deg] hover:rotate-0 transition-all duration-300 ${imagesLoaded ? "opacity-100" : "opacity-0"}`}>
                      <img
                        src={screwsDetailLeft}
                        alt="Vis dorées sur bois"
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                  </div>

                  {/* Main Search */}
                  <div className="max-w-2xl flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
                      Vis à bois de qualité professionnelle
                    </h1>
                    <form onSubmit={handleSearch} className="relative">
                      <Input
                        type="search"
                        placeholder="Rechercher par référence, dimensions, type... (ex: vis terrasse inox 5x50)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-4 pr-28 py-4 text-base border-2 border-primary/30 focus:border-primary bg-background/90 backdrop-blur-sm shadow-lg"
                      />
                      <Button
                        type="submit"
                        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-l-none bg-accent hover:bg-accent/90"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Rechercher
                      </Button>
                    </form>

                    <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mt-6">
                      <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                        <Truck className="h-4 w-4 text-primary" />
                        <span>Livraison 24/48h</span>
                      </div>
                      <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-full shadow-sm">
                        <Shield className="h-4 w-4 text-success" />
                        <span>Qualité certifiée</span>
                      </div>
                    </div>
                  </div>

                  {/* Right decorative image — masquée dès lg : la place est au blog */}
                  <div className="hidden md:block lg:hidden flex-shrink-0">
                    <div className={`w-28 h-28 rounded-2xl overflow-hidden shadow-xl ring-4 ring-primary/20 rotate-[6deg] hover:rotate-0 transition-all duration-300 ${imagesLoaded ? "opacity-100" : "opacity-0"}`}>
                      <img
                        src={screwsDetailRight}
                        alt="Vis inox sur bois"
                        className="w-full h-full object-cover"
                        loading="eager"
                      />
                    </div>
                  </div>
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 max-w-5xl mx-auto mt-10">
                  {categories.map((category) => (
                    <CategoryCard
                      key={category.id}
                      id={category.id}
                      name={category.name}
                      slug={category.slug}
                      imageUrl={category.image_url}
                      count={category.count}
                    />
                  ))}
                </div>
              </section>

              <QuickOrderSection />
              <FeaturedProducts />
              <SeoExploreLinks />
            </div>

            {/* Blog : dès sous le header, à droite (desktop) */}
            <div className="order-first mb-4 lg:order-none lg:mb-0 lg:pt-2">
              <BlogSidebar />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
};

export default Index;
