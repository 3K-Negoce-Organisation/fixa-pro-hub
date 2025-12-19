import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag, Percent } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ProductGrid } from "@/components/products/ProductGrid";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage, parseVariants, type Product } from "@/lib/products";

const PromosPage = () => {
  // Fetch promo products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promo-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_promo", true)
        .order("title");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Transform Supabase products to display format
  const displayProducts = useMemo(() => {
    return products.map((product: Product) => {
      const variants = parseVariants(product);
      const firstVariant = variants[0];
      const image = getProductImage(product);

      // Use promo price if available
      const displayPriceHT = product.promo_price_ht ?? product.price_ht;
      const displayPriceTTC = product.promo_price_ht 
        ? Math.round(product.promo_price_ht * 1.2 * 100) / 100 
        : product.price_ttc;

      return {
        id: product.id,
        variantId: firstVariant?.id || product.id,
        handle: product.handle,
        title: product.title,
        priceHT: displayPriceHT,
        priceTTC: displayPriceTTC,
        originalPriceHT: product.promo_price_ht ? product.price_ht : undefined,
        originalPriceTTC: product.promo_price_ht ? product.price_ttc : undefined,
        image,
        category: product.category || "general",
        diameter_mm: product.diameter_mm,
        length_mm: product.length_mm,
        material: product.material,
        drive_type: product.drive_type,
        stock: product.stock ?? 0,
        inStock: (product.stock ?? 0) > 0,
        isPromo: true,
      };
    });
  }, [products]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        <div className="container py-6">
          {/* Page header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Percent className="h-6 w-6 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">
                Promotions
              </h1>
            </div>
            <p className="text-muted-foreground">
              {displayProducts.length} produit
              {displayProducts.length > 1 ? "s" : ""} en promotion
            </p>
          </div>

          {/* Promo banner */}
          {displayProducts.length > 0 && (
            <div className="mb-6 p-4 bg-gradient-to-r from-destructive/10 to-orange-500/10 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-destructive" />
                <span className="font-medium text-foreground">
                  Profitez de nos offres exceptionnelles !
                </span>
              </div>
            </div>
          )}

          {/* Products grid */}
          <ProductGrid products={displayProducts} isLoading={isLoading} />

          {/* Empty state */}
          {!isLoading && displayProducts.length === 0 && (
            <div className="text-center py-16">
              <div className="p-4 bg-muted rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Tag className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Aucune promotion en cours</h2>
              <p className="text-muted-foreground">
                Revenez bientôt pour découvrir nos prochaines offres !
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PromosPage;