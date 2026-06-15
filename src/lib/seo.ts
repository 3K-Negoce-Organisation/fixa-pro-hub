import type { Product } from "@/lib/products";
import { getProductSeoFallbackDescription } from "@/lib/productSeoFallbacks";

export const SITE_URL = "https://www.vis-a-bois.com";
export const SITE_NAME = "Vis-à-Bois";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const DEFAULT_TITLE = "Vis à bois professionnelles — Vis-à-Bois | Livraison 24/48h";
export const DEFAULT_DESCRIPTION =
  "Spécialiste des vis à bois pour professionnels du bâtiment : terrasse, charpente, tirefond. +5000 références en stock. Livraison 24/48h. Prix HT.";

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${normalized}`;
}

export function buildProductTitle(product: Product): string {
  return `${product.title} — ${SITE_NAME}`;
}

export function buildProductSeoDescription(product: Product): string {
  if (product.description?.trim()) {
    return product.description.trim().split(/\r?\n/)[0].slice(0, 160);
  }

  const fallback = getProductSeoFallbackDescription(product.handle);
  if (fallback) return fallback.slice(0, 160);

  const parts: string[] = ["Vis à bois professionnelle"];
  if (product.diameter_mm && product.length_mm) {
    parts.push(`${product.diameter_mm}×${product.length_mm} mm`);
  }
  if (product.material) parts.push(product.material);
  if (product.drive_type) parts.push(product.drive_type);
  if (product.usage) parts.push(`usage ${product.usage}`);
  if (product.categories?.name) parts.push(product.categories.name);

  return `${parts.join(" — ")}. Livraison 24/48h chez ${SITE_NAME}.`;
}

export function buildCategoryTitle(categoryName: string): string {
  const lower = categoryName.toLowerCase();
  if (lower.includes("vis")) {
    return `${categoryName} — Vis-à-Bois`;
  }
  return `Vis à bois ${categoryName} — Vis-à-Bois`;
}

export function buildCategoryDescription(categoryName: string, productCount?: number): string {
  const countText =
    productCount && productCount > 0
      ? `${productCount} références de vis à bois`
      : "Large gamme de vis à bois";
  return `${countText} pour ${categoryName.toLowerCase()}. Acier zingué, inox A2/A4, livraison 24/48h aux professionnels. Commandez sur Vis-à-Bois.`;
}

export function buildProductsListTitle(query?: string | null, categoryName?: string | null): string {
  if (query) return `Recherche « ${query} » — Vis à bois | ${SITE_NAME}`;
  if (categoryName) return buildCategoryTitle(categoryName);
  return `Catalogue vis à bois professionnelles — ${SITE_NAME}`;
}

export function buildProductsListDescription(
  query?: string | null,
  categoryName?: string | null,
  productCount?: number,
): string {
  if (query) {
    return `Résultats pour « ${query} » dans notre catalogue de vis à bois professionnelles. Livraison 24/48h, prix HT.`;
  }
  if (categoryName) return buildCategoryDescription(categoryName, productCount);
  return "Parcourez notre catalogue de vis à bois pour professionnels : terrasse, charpente, agglo, tirefond. Livraison 24/48h.";
}

export function buildProductsListCanonical(
  categorySlug?: string | null,
  query?: string | null,
): string {
  if (query) return absoluteUrl(`/produits?q=${encodeURIComponent(query)}`);
  if (categorySlug) return absoluteUrl(`/produits?category=${encodeURIComponent(categorySlug)}`);
  return absoluteUrl("/produits");
}

export function buildProductJsonLd(
  product: Product,
  imageUrl: string,
  priceTtc: number,
  inStock: boolean,
): Record<string, unknown> {
  const description = buildProductSeoDescription(product);
  const image = imageUrl.startsWith("http") ? imageUrl : absoluteUrl(imageUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    image,
    description,
    sku: product.code_alsafix || product.handle,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produit/${product.handle}`),
      priceCurrency: "EUR",
      price: priceTtc.toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };
}

export function buildProductBreadcrumbJsonLd(product: Product): Record<string, unknown> {
  const items: { name: string; item: string }[] = [
    { name: "Accueil", item: absoluteUrl("/") },
    { name: "Produits", item: absoluteUrl("/produits") },
  ];

  if (product.categories) {
    items.push({
      name: product.categories.name,
      item: absoluteUrl(`/produits?category=${product.categories.slug}`),
    });
  }

  items.push({
    name: product.title,
    item: absoluteUrl(`/produit/${product.handle}`),
  });

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: entry.item,
    })),
  };
}
