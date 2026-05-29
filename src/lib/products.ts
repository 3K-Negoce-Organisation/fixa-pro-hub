// Supabase Products Service
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type CategoryRef = {
  id: string;
  name: string;
  slug: string;
};

export type Product = Tables<"products"> & {
  categories: CategoryRef | null;
};

export interface ProductVariant {
  id: string;
  title: string;
  price_ht: number;
  price_ttc: number;
  available: boolean;
  quantity: number;
}

const GENERIC_VARIANT_TITLES = new Set(["default", "unité", "unite"]);

export function normalizeVariantTitle(title: string | undefined): string {
  const t = (title || "").trim();
  if (!t || GENERIC_VARIANT_TITLES.has(t.toLowerCase())) return "Unité";
  return t;
}

export function getDisplayVariantTitle(title: string | null | undefined): string | null {
  const t = (title || "").trim();
  if (!t || GENERIC_VARIANT_TITLES.has(t.toLowerCase())) return null;
  return t;
}

/** Échappe % et _ pour ilike ; retire les virgules (séparateur PostgREST .or). */
export function escapeForIlike(value: string): string {
  return value
    .trim()
    .replace(/,/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/** Filtre recherche catalogue : titre, code Alsafix, désignation, handle. */
export function buildProductsSearchOrFilter(searchQuery: string): string {
  const pattern = `%${escapeForIlike(searchQuery)}%`;
  return [
    `title.ilike.${pattern}`,
    `code_alsafix.ilike.${pattern}`,
    `designation_fr.ilike.${pattern}`,
    `handle.ilike.${pattern}`,
  ].join(",");
}

// Fetch all active products (with joined category)
export async function fetchProducts(searchQuery?: string) {
  let query = supabase
    .from("products")
    .select("*, categories(id, name, slug)")
    .eq("is_active", true)
    .order("title");

  const term = searchQuery?.trim();
  if (term) {
    query = query.or(buildProductsSearchOrFilter(term));
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching products:", error);
    throw error;
  }

  return (data || []) as Product[];
}

// Fetch a single product by handle (with joined category)
export async function fetchProductByHandle(handle: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(id, name, slug)")
    .eq("handle", handle)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("Error fetching product:", error);
    throw error;
  }

  return data as Product | null;
}

// Parse variants from JSON field
export function parseVariants(product: Product): ProductVariant[] {
  if (!product.variants || !Array.isArray(product.variants) || product.variants.length === 0) {
    // Default variant from main product
    return [{
      id: product.id,
      title: "Unité",
      price_ht: product.price_ht,
      price_ttc: product.price_ttc,
      available: (product.stock ?? 0) > 0,
      quantity: product.stock ?? 0,
    }];
  }

  return (product.variants as any[]).map((v, index) => ({
    id: v.id || `${product.id}-${index}`,
    title: normalizeVariantTitle(v.title),
    price_ht: v.price_ht ?? product.price_ht,
    price_ttc: v.price_ttc ?? product.price_ttc,
    available: (v.stock ?? product.stock ?? 0) > 0,
    quantity: v.stock ?? product.stock ?? 0,
  }));
}

// Get primary image URL from product
export function getProductImage(product: Product): string {
  if (!product.images || !Array.isArray(product.images) || product.images.length === 0) {
    return "/placeholder.svg";
  }
  const firstImage = product.images[0] as { url?: string } | string;
  return typeof firstImage === "string" ? firstImage : firstImage?.url || "/placeholder.svg";
}

// Price formatting utilities
const TVA_RATE = 0.20;

export function formatPriceHT(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatPriceTTC(amount: number): string {
  const priceTTC = amount * (1 + TVA_RATE);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(priceTTC);
}

// Format TTC directly (when price is already TTC)
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function calculateTTC(amountHT: number): number {
  return amountHT * (1 + TVA_RATE);
}
