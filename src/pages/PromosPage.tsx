import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tag, Percent } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageBackground } from "@/components/layout/PageBackground";
import { ProductGrid } from "@/components/products/ProductGrid";
import { PageSeo } from "@/components/seo/PageSeo";
import { STATIC_PAGE_SEO, staticPageCanonical } from "@/lib/staticPageSeo";
import { supabase } from "@/integrations/supabase/client";
import { getProductImage, parseVariants, type Product } from "@/lib/products";
import { resolveProductImageUrl } from "@/lib/imageFallback";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";

const PromosPage = () => {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  // Fetch promo products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["promo-products", siteId],
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .eq("is_promo", true)
        .order("title");
      if (siteId) q = q.eq("site_id", siteId);

      const { data, error } = await q;

      if (error) throw error;
      const promoRows = (data || []) as Product[];
      const giftIds = Array.from(
        new Set(
          promoRows
            .map((p) => (p as any).promo_gift_product_id as string | null)
            .filter((id): id is string => !!id),
        ),
      );
      let giftMap: Record<string, { title: string; handle: string; image: string }> = {};
      if (giftIds.length > 0) {
        const { data: giftRows } = await supabase
          .from("products")
          .select("id, title, handle, images")
          .in("id", giftIds);
        giftMap = Object.fromEntries(
          ((giftRows || []) as any[]).map((g) => [
            g.id,
            {
              title: g.title,
              handle: g.handle,
              image:
                Array.isArray(g.images) && g.images.length > 0
                  ? (typeof g.images[0] === "string" ? g.images[0] : resolveProductImageUrl(g.images[0]?.url))
                  : resolveProductImageUrl(null),
            },
          ]),
        );
      }
      return promoRows.map((row) => ({ ...row, _giftMeta: giftMap[(row as any).promo_gift_product_id] }));
    },
    enabled: !siteLoading,
  });

  // Transform Supabase products to display format (filter out expired promos)
  const displayProducts = useMemo(() => {
    const now = new Date();
    return products
      .filter((product: Product) => {
        const promoEndDate = (product as any).promo_end_date ? new Date((product as any).promo_end_date) : null;
        return !promoEndDate || promoEndDate >= now;
      })
      .map((product: Product & { _giftMeta?: { title: string; handle: string; image: string } }) => {
        const variants = parseVariants(product);
        const firstVariant = variants[0];
        const image = getProductImage(product);
        const promoDiscountPercent = (product as any).promo_discount_percent as number | null;
        const computedPromoPriceHT =
          promoDiscountPercent && promoDiscountPercent > 0
            ? Math.round(product.price_ht * (1 - promoDiscountPercent / 100) * 100) / 100
            : null;

        // Use promo price if available
        const displayPriceHT = computedPromoPriceHT ?? product.promo_price_ht ?? product.price_ht;
        const displayPriceTTC = (computedPromoPriceHT ?? product.promo_price_ht)
          ? Math.round(displayPriceHT * 1.2 * 100) / 100
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
          category: product.categories?.name || product.category || "",
          diameter_mm: product.diameter_mm,
          length_mm: product.length_mm,
          material: product.material,
          drive_type: product.drive_type,
          stock: product.stock ?? 0,
          inStock: (product.stock ?? 0) > 0,
          isPromo: true,
          promoDiscountPercent: promoDiscountPercent ?? null,
          promoGiftProductId: (product as any).promo_gift_product_id ?? null,
          promoGiftQuantity: (product as any).promo_gift_quantity ?? null,
          promoLabel: (product as any).promo_label ?? null,
          promoGiftTitle: product._giftMeta?.title ?? null,
          promoGiftHandle: product._giftMeta?.handle ?? null,
          promoGiftImage: product._giftMeta?.image ?? null,
          variantTitle: firstVariant?.title || "Unité",
          boxQuantity: product.box_quantity ?? null,
        };
      });
  }, [products]);

  return (
    <PageBackground>
      <PageSeo
        title={STATIC_PAGE_SEO.promos.title}
        description={STATIC_PAGE_SEO.promos.description}
        canonical={staticPageCanonical(STATIC_PAGE_SEO.promos.path)}
      />
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
    </PageBackground>
  );
};

export default PromosPage;