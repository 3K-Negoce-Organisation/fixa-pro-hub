import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Grid3X3, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import {
  mockProducts,
  filterProducts,
  searchProducts,
  getProductsByCategory,
} from "@/lib/mockData";

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("cat");
  const query = searchParams.get("q");

  const [filters, setFilters] = useState<Record<string, string[]>>({
    diameter: [],
    length: [],
    driveType: [],
    material: [],
    headType: [],
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(true);

  // Filter and search products
  const filteredProducts = useMemo(() => {
    let products = category
      ? getProductsByCategory(category)
      : mockProducts;

    if (query) {
      products = searchProducts(products, query);
    }

    products = filterProducts(products, filters);

    // Sort products
    switch (sortBy) {
      case "price-asc":
        products = [...products].sort((a, b) => a.priceHT - b.priceHT);
        break;
      case "price-desc":
        products = [...products].sort((a, b) => b.priceHT - a.priceHT);
        break;
      case "name":
        products = [...products].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return products;
  }, [category, query, filters, sortBy]);

  const handleFilterChange = (key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  };

  const handleClearFilters = () => {
    setFilters({
      diameter: [],
      length: [],
      driveType: [],
      material: [],
      headType: [],
    });
  };

  const activeFilterCount = Object.values(filters).flat().length;

  const getCategoryTitle = () => {
    if (query) return `Résultats pour "${query}"`;
    switch (category) {
      case "terrasse":
        return "Vis Terrasse";
      case "charpente":
        return "Vis Charpente";
      case "agglo":
        return "Vis Aggloméré";
      case "boulonnerie":
        return "Boulonnerie";
      default:
        return "Tous les produits";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Page header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {getCategoryTitle()}
              </h1>
              <p className="text-muted-foreground">
                {filteredProducts.length} produit
                {filteredProducts.length > 1 ? "s" : ""} trouvé
                {filteredProducts.length > 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Mobile filter toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtres
                {activeFilterCount > 0 && (
                  <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {/* Sort select */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Pertinence</SelectItem>
                  <SelectItem value="price-asc">Prix croissant</SelectItem>
                  <SelectItem value="price-desc">Prix décroissant</SelectItem>
                  <SelectItem value="name">Nom A-Z</SelectItem>
                </SelectContent>
              </Select>

              {/* Desktop filter toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="hidden md:flex"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                {showFilters ? "Masquer" : "Afficher"} les filtres
              </Button>
            </div>
          </div>

          {/* Active filters badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(filters).map(([key, values]) =>
                values.map((value) => (
                  <Badge
                    key={`${key}-${value}`}
                    variant="secondary"
                    className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() =>
                      handleFilterChange(
                        key,
                        values.filter((v) => v !== value)
                      )
                    }
                  >
                    {value} ×
                  </Badge>
                ))
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs"
              >
                Effacer tout
              </Button>
            </div>
          )}

          {/* Main content with sidebar */}
          <div className="flex gap-6">
            {/* Filters sidebar */}
            {showFilters && (
              <ProductFilters
                filters={filters}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
              />
            )}

            {/* Products grid */}
            <div className="flex-1">
              <ProductGrid products={filteredProducts} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;
