import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
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
import { fetchProducts, getProductImage, parseVariants, type Product } from "@/lib/products";

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

  // Fetch products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query || undefined),
  });

  // Transform Supabase products to display format
  const displayProducts = useMemo(() => {
    return products.map((product: Product) => {
      const variants = parseVariants(product);
      const firstVariant = variants[0];
      const image = getProductImage(product);
      const tags = product.tags || [];
      
      return {
        id: product.id,
        variantId: firstVariant?.id || product.id,
        handle: product.handle,
        title: product.title,
        priceHT: product.price_ht,
        priceTTC: product.price_ttc,
        image,
        category: product.category || "general",
        specs: {
          diameter: tags.find((t: string) => t.includes("mm") && !t.includes("x"))?.replace("mm", "") || "",
          length: tags.find((t: string) => t.includes("x"))?.split("x")[1] || "",
          driveType: tags.find((t: string) => ["Torx", "Pozidriv", "Phillips"].some(d => t.includes(d))) || "",
          material: tags.find((t: string) => ["Inox", "Acier", "Zingué"].some(m => t.includes(m))) || "",
          headType: tags.find((t: string) => ["Fraisée", "Plate", "Ronde"].some(h => t.includes(h))) || "",
        },
        stock: product.stock ?? 0,
        inStock: (product.stock ?? 0) > 0,
        tags,
      };
    });
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = displayProducts;

    // Filter by category
    if (category) {
      result = result.filter((p) =>
        p.category.toLowerCase().includes(category.toLowerCase()) ||
        p.tags.some((t: string) => t.toLowerCase().includes(category.toLowerCase()))
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter((product) => {
          const specValue = product.specs[key as keyof typeof product.specs];
          return values.some((v) =>
            specValue?.toLowerCase().includes(v.toLowerCase()) ||
            product.tags.some((t: string) => t.toLowerCase().includes(v.toLowerCase()))
          );
        });
      }
    });

    // Sort products
    switch (sortBy) {
      case "price-asc":
        result = [...result].sort((a, b) => a.priceHT - b.priceHT);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.priceHT - a.priceHT);
        break;
      case "name":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [displayProducts, category, filters, sortBy]);

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
              <ProductGrid products={filteredProducts} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;
