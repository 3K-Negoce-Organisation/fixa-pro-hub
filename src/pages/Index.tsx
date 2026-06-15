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
import { PageSeo } from "@/components/seo/PageSeo";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
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

  // Fetch categories from Supabase
  const { data: dbCategories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, image_url, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch product counts by category_id
  const { data: categoryCounts } = useQuery({
    queryKey: ["category-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((product) => {
        if (product.category_id) {
          counts[product.category_id] = (counts[product.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const categories = dbCategories.map((cat) => ({
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
            target: `${SITE_URL}/produits?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <Header />

      <main className="flex-1">
        {/* Hero Search Section */}
        <section className="relative overflow-hidden py-12 md:py-16">
          {/* Background image with transparency */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: `url(${heroScrewsBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
          
          <div className="container relative z-10">
            {/* Main content with decorative images */}
            <div className="flex items-center justify-center gap-6 lg:gap-12">
              {/* Left decorative image - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                <div className={`w-32 lg:w-40 h-32 lg:h-40 rounded-2xl overflow-hidden shadow-xl ring-4 ring-primary/20 rotate-[-6deg] hover:rotate-0 transition-all duration-300 ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`}>
                  <img 
                    src={screwsDetailLeft} 
                    alt="Vis dorées sur bois" 
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                {!imagesLoaded && (
                  <div className="w-32 lg:w-40 h-32 lg:h-40 rounded-2xl bg-muted animate-pulse rotate-[-6deg] absolute" />
                )}
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
                
                {/* Quick stats */}
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
              
              {/* Right decorative image - hidden on mobile */}
              <div className="hidden md:block flex-shrink-0">
                <div className={`w-32 lg:w-40 h-32 lg:h-40 rounded-2xl overflow-hidden shadow-xl ring-4 ring-primary/20 rotate-[6deg] hover:rotate-0 transition-all duration-300 ${imagesLoaded ? 'opacity-100' : 'opacity-0'}`}>
                  <img 
                    src={screwsDetailRight} 
                    alt="Vis inox sur bois" 
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
                {!imagesLoaded && (
                  <div className="w-32 lg:w-40 h-32 lg:h-40 rounded-2xl bg-muted animate-pulse rotate-[6deg] absolute" />
                )}
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mt-10">
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
          </div>
        </section>

        {/* Main Content */}
        <div className="container">
          <QuickOrderSection />
          <FeaturedProducts />
          <SeoExploreLinks />
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
};

export default Index;
