import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Shield, Truck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CategoryCard } from "@/components/home/CategoryCard";
import { QuickOrderSection } from "@/components/home/QuickOrderSection";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { categories } from "@/lib/mockData";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/produits?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Search Section */}
        <section className="bg-gradient-to-b from-secondary to-background py-8">
          <div className="container">
            {/* Main Search */}
            <div className="max-w-2xl mx-auto mb-8">
              <h1 className="text-2xl font-bold text-center mb-4">
                Vis de qualité
              </h1>
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="search"
                  placeholder="Rechercher par référence, dimensions, type... (ex: vis terrasse inox 5x50)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-24 py-3 text-base border-2 border-primary/20 focus:border-primary"
                />
                <Button
                  type="submit"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-accent hover:bg-accent/90"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Rechercher
                </Button>
              </form>
            </div>

            {/* Quick stats */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground mb-8">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <span>Livraison 24/48h</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-success" />
                <span>Qualité certifiée</span>
              </div>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {categories.map((category) => (
                <CategoryCard
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  icon={category.icon}
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
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
