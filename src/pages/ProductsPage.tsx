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
    material: [],
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(true);

  // Fetch products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query || undefined),
  });

  // Generate filter options from actual product data
  const filterOptions = useMemo(() => {
    const diameters = new Set<string>();
    const lengths = new Set<string>();
    const materials = new Set<string>();

    products.forEach((product: Product) => {
      if (product.diameter_mm) diameters.add(String(product.diameter_mm));
      if (product.length_mm) lengths.add(String(product.length_mm));
      if (product.material) materials.add(product.material.trim());
    });

    // Sort numerically for diameter and length
    const sortNumeric = (a: string, b: string) => parseFloat(a) - parseFloat(b);

    return {
      diameter: Array.from(diameters).sort(sortNumeric),
      length: Array.from(lengths).sort(sortNumeric),
      material: Array.from(materials).sort(),
    };
  }, [products]);

  // Transform Supabase products to display format
  const displayProducts = useMemo(() => {
    return products.map((product: Product) => {
      const variants = parseVariants(product);
      const firstVariant = variants[0];
      const image = getProductImage(product);
      
      // Use promo price if available
      const isPromo = !!(product.is_promo && product.promo_price_ht);
      const displayPriceHT = isPromo ? product.promo_price_ht! : product.price_ht;
      const displayPriceTTC = isPromo 
        ? Math.round(product.promo_price_ht! * 1.2 * 100) / 100 
        : product.price_ttc;

      return {
        id: product.id,
        variantId: firstVariant?.id || product.id,
        handle: product.handle,
        title: product.title,
        priceHT: displayPriceHT,
        priceTTC: displayPriceTTC,
        originalPriceHT: isPromo ? product.price_ht : undefined,
        originalPriceTTC: isPromo ? product.price_ttc : undefined,
        image,
        category: product.category || "general",
        diameter_mm: product.diameter_mm,
        length_mm: product.length_mm,
        material: product.material,
        drive_type: product.drive_type,
        stock: product.stock ?? 0,
        inStock: (product.stock ?? 0) > 0,
        isPromo: isPromo,
      };
    });
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = displayProducts;

    // Filter by category
    if (category) {
      result = result.filter((p) =>
        p.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter((product) => {
          switch (key) {
            case 'diameter':
              return values.some(v => String(product.diameter_mm) === v);
            case 'length':
              return values.some(v => String(product.length_mm) === v);
            case 'material':
              return values.some(v => product.material?.toLowerCase().includes(v.toLowerCase()));
            default:
              return true;
          }
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
      material: [],
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
                filterOptions={filterOptions}
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
