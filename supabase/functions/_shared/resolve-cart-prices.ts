/**
 * Recalcule les prix panier côté serveur depuis `products` (ignore les prix client).
 * Même formule promo que la vitrine / AdminProductsPage.
 */
import { roundMoney } from "./money.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export type CartPriceLine = {
  id: string;
  priceHT: number;
  priceTTC?: number;
  isGift?: boolean;
  [key: string]: unknown;
};

export type ProductPriceRow = {
  id: string;
  price_ht: number | null;
  price_ttc: number | null;
  is_promo?: boolean | null;
  promo_price_ht?: number | null;
  promo_discount_percent?: number | null;
  promo_end_date?: string | null;
  is_active?: boolean | null;
};

export function effectiveProductPrices(
  product: ProductPriceRow,
  now: Date = new Date(),
): { priceHT: number; priceTTC: number } {
  const listHt = roundMoney(Number(product.price_ht) || 0);
  const listTtc = Number(product.price_ttc) > 0
    ? roundMoney(Number(product.price_ttc))
    : roundMoney(listHt * 1.2);

  const promoEnd = product.promo_end_date ? new Date(product.promo_end_date) : null;
  const expired = promoEnd ? promoEnd < now : false;
  const pct = Number(product.promo_discount_percent) || 0;
  const computedFromPct =
    pct > 0 && listHt > 0 ? roundMoney(listHt * (1 - pct / 100)) : null;
  const storedPromo = Number(product.promo_price_ht) > 0
    ? roundMoney(Number(product.promo_price_ht))
    : null;
  const promoHt =
    product.is_promo && !expired ? (computedFromPct ?? storedPromo) : null;

  if (promoHt != null && promoHt > 0) {
    return { priceHT: promoHt, priceTTC: roundMoney(promoHt * 1.2) };
  }
  return { priceHT: listHt, priceTTC: listTtc };
}

/** Remplace priceHT/priceTTC des lignes payables par les prix catalogue (+ promo valide). */
export async function resolveCartLinesFromCatalog<T extends CartPriceLine>(
  admin: SupabaseClient,
  lines: T[],
): Promise<T[]> {
  const ids = [...new Set(
    lines
      .filter((l) => !l.isGift)
      .map((l) => String(l.id || "").trim())
      .filter(Boolean),
  )];
  if (ids.length === 0) return lines;

  const { data, error } = await admin
    .from("products")
    .select(
      "id, price_ht, price_ttc, is_promo, promo_price_ht, promo_discount_percent, promo_end_date, is_active",
    )
    .in("id", ids);

  if (error) throw new Error(`Catalogue prix: ${error.message}`);

  const byId = new Map((data ?? []).map((p) => [p.id as string, p as ProductPriceRow]));
  const now = new Date();

  return lines.map((line) => {
    if (line.isGift) {
      return { ...line, priceHT: 0, priceTTC: 0 };
    }
    const product = byId.get(String(line.id));
    if (!product) {
      throw new Error(`Produit introuvable pour le paiement: ${line.id}`);
    }
    if (product.is_active === false) {
      throw new Error(`Produit inactif: ${line.id}`);
    }
    const { priceHT, priceTTC } = effectiveProductPrices(product, now);
    if (priceHT <= 0 && priceTTC <= 0) {
      throw new Error(`Prix catalogue invalide pour: ${line.id}`);
    }
    return { ...line, priceHT, priceTTC };
  });
}
