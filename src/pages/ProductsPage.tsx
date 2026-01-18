import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
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
import { PageBackground } from "@/components/layout/PageBackground";
import { ProductFilters } from "@/components/products/ProductFilters";
import { ProductGrid } from "@/components/products/ProductGrid";
import { fetchProducts, getProductImage, parseVariants, type Product } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";

type ItemsPerPage = "12" | "25" | "50" | "all";

const ProductsPage = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get("category");
  const query = searchParams.get("q");
  const { isOpen: isCartOpen } = useCart();

  const [filters, setFilters] = useState<Record<string, string[]>>({
    diameter: [],
    length: [],
    material: [],
  });
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>("25");

  // Fetch products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products", query],
    queryFn: () => fetchProducts(query || undefined),
  });

  // Fonction pour convertir slug URL vers nom de catégorie DB
  const slugToCategory = (slug: string): string | null => {
    // Chercher une catégorie dont le slug correspond
    const match = products.find((p: Product) => {
      if (!p.category) return false;
      const productSlug = p.category
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
      return productSlug === slug;
    });
    return match?.category || null;
  };

  // Get products filtered by category (base for filter options)
  const categoryFilteredProducts = useMemo(() => {
    let result = products;

    if (categoryParam) {
      const dbCategory = slugToCategory(categoryParam);
      if (dbCategory) {
        result = result.filter((p: Product) => p.category?.trim() === dbCategory);
      }
    }
    
    return result;
  }, [products, categoryParam]);

  // Generate filter options from products that match OTHER active filters
  // This ensures we only show filter values that would return results
  const filterOptions = useMemo(() => {
    const getFilteredProducts = (excludeFilter: string) => {
      let result = categoryFilteredProducts;
      
      Object.entries(filters).forEach(([key, values]) => {
        if (key === excludeFilter || values.length === 0) return;
        
        result = result.filter((product: Product) => {
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
      });
      
      return result;
    };

    const extractDiameters = (prods: Product[]) => {
      const set = new Set<string>();
      prods.forEach(p => { if (p.diameter_mm) set.add(String(p.diameter_mm)); });
      return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
    };

    const extractLengths = (prods: Product[]) => {
      const set = new Set<string>();
      prods.forEach(p => { if (p.length_mm) set.add(String(p.length_mm)); });
      return Array.from(set).sort((a, b) => parseFloat(a) - parseFloat(b));
    };

    const extractMaterials = (prods: Product[]) => {
      const set = new Set<string>();
      prods.forEach(p => { if (p.material) set.add(p.material.trim()); });
      return Array.from(set).sort();
    };

    return {
      diameter: extractDiameters(getFilteredProducts('diameter')),
      length: extractLengths(getFilteredProducts('length')),
      material: extractMaterials(getFilteredProducts('material')),
    };
  }, [categoryFilteredProducts, filters]);

  // Transform Supabase products to display format
  const displayProducts = useMemo(() => {
    const now = new Date();
    return products.map((product: Product) => {
      const variants = parseVariants(product);
      const firstVariant = variants[0];
      const image = getProductImage(product);
      
      // Check if promo is valid (not expired)
      const promoEndDate = (product as any).promo_end_date ? new Date((product as any).promo_end_date) : null;
      const isPromoExpired = promoEndDate ? promoEndDate < now : false;
      
      // Use promo price if available and not expired
      const isPromo = !!(product.is_promo && product.promo_price_ht && !isPromoExpired);
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
        promoEndDate: isPromo && promoEndDate ? promoEndDate.toISOString() : null,
      };
    });
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    let result = displayProducts;

    // Map URL category param to database category
    const categoryMap: Record<string, string> = {
      terrasse: "Vis terrasse",
      charpente: "Vis de charpente",
      menuiserie: "Vis menuiserie",
      tirefond: "Tirefond",
    };

    // Filter by category
    if (categoryParam) {
      const dbCategory = categoryMap[categoryParam];
      if (dbCategory) {
        result = result.filter((p) => p.category?.trim() === dbCategory);
      }
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
  }, [displayProducts, categoryParam, filters, sortBy]);

  // Reset page when filters or category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filters, categoryParam, query]);

  // Calculate pagination
  const totalProducts = filteredProducts.length;
  const perPage = itemsPerPage === "all" ? totalProducts : parseInt(itemsPerPage);
  const totalPages = Math.ceil(totalProducts / perPage) || 1;

  // Paginated products
  const paginatedProducts = useMemo(() => {
    if (itemsPerPage === "all") return filteredProducts;
    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, currentPage, itemsPerPage, perPage]);

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

  const handleItemsPerPageChange = (value: ItemsPerPage) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeFilterCount = Object.values(filters).flat().length;

  const getCategoryTitle = () => {
    if (query) return `Résultats pour "${query}"`;
    switch (categoryParam) {
      case "terrasse":
        return "Vis Terrasse";
      case "charpente":
        return "Vis Charpente";
      case "menuiserie":
        return "Vis Menuiserie";
      case "tirefond":
        return "Tirefond";
      default:
        return "Tous les produits";
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  const startIndex = itemsPerPage === "all" ? 1 : (currentPage - 1) * perPage + 1;
  const endIndex = itemsPerPage === "all" ? totalProducts : Math.min(currentPage * perPage, totalProducts);

  return (
    <PageBackground>
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

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {/* Mobile filter toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="md:hidden"
              >
                <SlidersHorizontal className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden xs:inline">Filtres</span>
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 sm:ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>

              {/* Items per page select */}
              <Select value={itemsPerPage} onValueChange={handleItemsPerPageChange}>
                <SelectTrigger className="w-20 sm:w-28">
                  <SelectValue placeholder="Par page" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12">12</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="all">Tous</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort select */}
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32 sm:w-44">
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

          {/* Mobile: Filters at top */}
          {showFilters && (
            <div className="md:hidden">
              <ProductFilters
                filters={filters}
                filterOptions={filterOptions}
                onFilterChange={handleFilterChange}
                onClearFilters={handleClearFilters}
                isCartOpen={isCartOpen}
              />
            </div>
          )}

          {/* Main content with sidebar */}
          <div className="flex gap-6">
            {/* Desktop: Filters sidebar */}
            {showFilters && (
              <div className="hidden md:block">
                <ProductFilters
                  filters={filters}
                  filterOptions={filterOptions}
                  onFilterChange={handleFilterChange}
                  onClearFilters={handleClearFilters}
                  isCartOpen={isCartOpen}
                />
              </div>
            )}

            {/* Products grid */}
            <div className="flex-1 min-w-0">
              <ProductGrid products={paginatedProducts} isLoading={isLoading} />

              {/* Pagination */}
              {itemsPerPage !== "all" && totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-4">
                  {/* Mobile: Simplified pagination */}
                  <div className="flex sm:hidden items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="text-sm px-3">
                      {currentPage} / {totalPages}
                    </span>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Desktop: Full pagination */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Précédent
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page, index) =>
                        page === "ellipsis" ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-9"
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Suivant
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Affichage {startIndex}-{endIndex} sur {totalProducts} produits
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </PageBackground>
  );
};

export default ProductsPage;
