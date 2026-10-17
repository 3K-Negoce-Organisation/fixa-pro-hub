/**
 * Recalcule les prix panier depuis le catalogue (jamais depuis le client).
 * Quantités seules acceptées du navigateur.
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { roundMoney } from "./money.ts";
import {
  computeCheckoutTotals,
  type CheckoutLine,
} from "./checkout-totals.ts";
import type { ShippingConfig } from "./shipping-config.ts";

const TVA_RATE = 0.2;

export type ClientCartQuantityLine = {
  id: string;
  quantity: number;
  variantId?: string;
  variantTitle?: string;
  title?: string;
  image?: string;
  isGift?: boolean;
};

export type CatalogPricedLine = CheckoutLine & {
  id: string;
  variantId?: string;
  variantTitle?: string;
  title?: string;
  image?: string;
  handle?: string;
};

export type CatalogProductPrice = {
  id: string;
  title: string | null;
  handle: string | null;
  images: Array<{ url?: string }> | null;
  price_ht: number | null;
  price_ttc: number | null;
  promo_price_ht: number | null;
  is_active: boolean | null;
};

export class CatalogRepriceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogRepriceError";
  }
}

function unitPricesFromProduct(product: CatalogProductPrice): {
  priceHT: number;
  priceTTC: number;
} {
  const promoHt =
    product.promo_price_ht != null && Number(product.promo_price_ht) > 0
      ? roundMoney(Number(product.promo_price_ht))
      : null;
  const priceHT = promoHt ??
    (product.price_ht != null && Number(product.price_ht) > 0
      ? roundMoney(Number(product.price_ht))
      : null);
  const priceTTCFromDb =
    product.price_ttc != null && Number(product.price_ttc) > 0
      ? roundMoney(Number(product.price_ttc))
      : null;

  if (promoHt != null) {
    return { priceHT: promoHt, priceTTC: roundMoney(promoHt * (1 + TVA_RATE)) };
  }
  if (priceHT != null && priceTTCFromDb != null) {
    return { priceHT, priceTTC: priceTTCFromDb };
  }
  if (priceTTCFromDb != null) {
    return {
      priceHT: roundMoney(priceTTCFromDb / (1 + TVA_RATE)),
      priceTTC: priceTTCFromDb,
    };
  }
  if (priceHT != null) {
    return { priceHT, priceTTC: roundMoney(priceHT * (1 + TVA_RATE)) };
  }
  throw new CatalogRepriceError(
    `Produit sans prix catalogue: ${product.id}`,
  );
}

export async function fetchCatalogProductsForCart(
  supabaseAdmin: SupabaseClient,
  productIds: string[],
): Promise<Map<string, CatalogProductPrice>> {
  const map = new Map<string, CatalogProductPrice>();
  const unique = [...new Set(productIds.filter(Boolean))];
  if (unique.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, title, handle, images, price_ht, price_ttc, promo_price_ht, is_active")
    .in("id", unique);

  if (error) {
    throw new CatalogRepriceError(`Lecture catalogue impossible: ${error.message}`);
  }
  for (const row of data || []) {
    map.set(row.id as string, row as CatalogProductPrice);
  }
  return map;
}

/**
 * Reprice chaque ligne depuis products.* — ignore priceHT/priceTTC client.
 */
export async function repriceCartFromCatalog(
  supabaseAdmin: SupabaseClient,
  rawItems: ClientCartQuantityLine[],
): Promise<CatalogPricedLine[]> {
  const payable = (rawItems ?? []).filter(
    (item) => !item.isGift && item.quantity > 0 && Boolean(item.id),
  );
  if (payable.length === 0) {
    throw new CatalogRepriceError("Panier vide");
  }

  const productMap = await fetchCatalogProductsForCart(
    supabaseAdmin,
    payable.map((i) => i.id),
  );

  const priced: CatalogPricedLine[] = [];
  for (const item of payable) {
    const product = productMap.get(item.id);
    if (!product) {
      throw new CatalogRepriceError(`Produit introuvable: ${item.id}`);
    }
    if (product.is_active === false) {
      throw new CatalogRepriceError(`Produit inactif: ${item.id}`);
    }
    const { priceHT, priceTTC } = unitPricesFromProduct(product);
    if (priceHT <= 0 || priceTTC <= 0) {
      throw new CatalogRepriceError(`Prix catalogue invalide: ${item.id}`);
    }
    const qty = Math.floor(Number(item.quantity));
    if (!Number.isFinite(qty) || qty < 1) {
      throw new CatalogRepriceError(`Quantité invalide pour ${item.id}`);
    }
    priced.push({
      id: item.id,
      quantity: qty,
      priceHT,
      priceTTC,
      title: product.title ?? item.title,
      handle: product.handle ?? undefined,
      image: item.image || product.images?.[0]?.url || undefined,
      variantId: item.variantId || item.id,
      variantTitle: item.variantTitle || "Default",
    });
  }
  return priced;
}

export function assertStripeAmountMatchesTotal(
  totalTTC: number,
  stripeAmountCents: number,
  toleranceCents = 0,
): void {
  const expected = Math.round(roundMoney(totalTTC) * 100);
  if (Math.abs(expected - stripeAmountCents) > toleranceCents) {
    throw new CatalogRepriceError(
      `Montant Stripe incohérent (attendu ${expected} cts, reçu ${stripeAmountCents} cts)`,
    );
  }
}

export async function repriceAndTotalFromCatalog(
  supabaseAdmin: SupabaseClient,
  rawItems: ClientCartQuantityLine[],
  shippingConfig: ShippingConfig,
) {
  const lines = await repriceCartFromCatalog(supabaseAdmin, rawItems);
  const totals = computeCheckoutTotals(lines, shippingConfig);
  return { lines, totals };
}
