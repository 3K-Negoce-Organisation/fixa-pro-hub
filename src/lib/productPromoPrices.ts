import { roundMoney } from "@/lib/utils";

/** Champs promo / catalogue nécessaires pour le prix affiché et panier. */
export type PromoPricedProduct = {
  price_ht: number;
  price_ttc: number;
  is_promo?: boolean | null;
  promo_price_ht?: number | null;
  promo_discount_percent?: number | null;
  promo_end_date?: string | null;
  promo_gift_product_id?: string | null;
};

export type EffectiveProductPrices = {
  priceHT: number;
  priceTTC: number;
  isPromo: boolean;
  originalPriceHT?: number;
  originalPriceTTC?: number;
};

/** Prix effectif vitrine / panier (promo % ou montant, non expirée). */
export function getEffectiveProductPrices(
  product: PromoPricedProduct,
  now: Date = new Date(),
): EffectiveProductPrices {
  const listHt = roundMoney(Number(product.price_ht) || 0);
  const listTtc =
    Number(product.price_ttc) > 0
      ? roundMoney(Number(product.price_ttc))
      : roundMoney(listHt * 1.2);

  const promoEnd = product.promo_end_date ? new Date(product.promo_end_date) : null;
  const expired = promoEnd ? promoEnd < now : false;
  const pct = Number(product.promo_discount_percent) || 0;
  const computedFromPct =
    pct > 0 && listHt > 0 ? roundMoney(listHt * (1 - pct / 100)) : null;
  const storedPromo =
    Number(product.promo_price_ht) > 0 ? roundMoney(Number(product.promo_price_ht)) : null;
  const hasPromoPrice = !!(computedFromPct || storedPromo);
  const hasPromoGift = !!product.promo_gift_product_id;
  const isPromo = !!(product.is_promo && (hasPromoPrice || hasPromoGift) && !expired);
  const promoHt = isPromo ? (computedFromPct ?? storedPromo ?? null) : null;

  if (promoHt != null && promoHt > 0) {
    return {
      priceHT: promoHt,
      priceTTC: roundMoney(promoHt * 1.2),
      isPromo: true,
      originalPriceHT: listHt,
      originalPriceTTC: listTtc,
    };
  }

  return { priceHT: listHt, priceTTC: listTtc, isPromo: false };
}
