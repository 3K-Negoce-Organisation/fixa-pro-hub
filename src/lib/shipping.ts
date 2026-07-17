/** TVA incluse dans les prix affichés et les seuils ci-dessous */

import { roundMoney } from "@/lib/utils";

export const TVA_RATE = 0.2;

export type ShippingConfig = {
  freeShippingThresholdTtc: number;
  defaultShippingFeeTtc: number;
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  freeShippingThresholdTtc: 150,
  defaultShippingFeeTtc: 12,
};

/** @deprecated Utiliser DEFAULT_SHIPPING_CONFIG.freeShippingThresholdTtc */
export const FREE_SHIPPING_THRESHOLD_TTC = DEFAULT_SHIPPING_CONFIG.freeShippingThresholdTtc;

/** @deprecated Utiliser DEFAULT_SHIPPING_CONFIG.defaultShippingFeeTtc */
export const SHIPPING_FEE_TTC = DEFAULT_SHIPPING_CONFIG.defaultShippingFeeTtc;

export function shippingConfigFromRow(
  row: {
    free_shipping_threshold?: number | null;
    default_shipping_fee?: number | null;
  } | null | undefined,
): ShippingConfig {
  if (!row) return DEFAULT_SHIPPING_CONFIG;
  const threshold = Number(row.free_shipping_threshold);
  const fee = Number(row.default_shipping_fee);
  return {
    freeShippingThresholdTtc:
      Number.isFinite(threshold) && threshold >= 0
        ? roundMoney(threshold)
        : DEFAULT_SHIPPING_CONFIG.freeShippingThresholdTtc,
    defaultShippingFeeTtc:
      Number.isFinite(fee) && fee >= 0
        ? roundMoney(fee)
        : DEFAULT_SHIPPING_CONFIG.defaultShippingFeeTtc,
  };
}

/** @deprecated Préférer le sous-total TTC issu de `cartProductsTTC` (price_ttc). */
export function cartSubtotalTTC(productsHT: number): number {
  return roundMoney(roundMoney(productsHT) * (1 + TVA_RATE));
}

export function shippingFeeTTC(
  subtotalTTC: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  return subtotalTTC >= config.freeShippingThresholdTtc ? 0 : config.defaultShippingFeeTtc;
}

export function shippingFeeHT(
  subtotalTTC: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  return roundMoney(shippingFeeTTC(subtotalTTC, config) / (1 + TVA_RATE));
}

/** Totaux commande : sous-total produits en TTC catalogue (price_ttc). */
export function orderGrandTotals(
  productsTTC: number,
  productsHT?: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
) {
  const subtotalTTC = roundMoney(productsTTC);
  const roundedProductsHT = roundMoney(
    productsHT ?? roundMoney(subtotalTTC / (1 + TVA_RATE)),
  );
  const shippingTTC = shippingFeeTTC(subtotalTTC, config);
  const grandTotalTTC = roundMoney(subtotalTTC + shippingTTC);
  const shippingHT = shippingFeeHT(subtotalTTC, config);
  const grandTotalHT = roundMoney(roundedProductsHT + shippingHT);
  return {
    subtotalTTC,
    shippingTTC,
    grandTotalTTC,
    shippingHT,
    grandTotalHT,
  };
}

export function splitOrderTotalsFromItems(
  items: Array<{ unit_price_ht: number; quantity: number }>,
  totalHT: number,
): { productsHT: number; shippingHT: number } {
  const productsHT = roundMoney(
    items.reduce(
      (sum, item) => sum + roundMoney(roundMoney(item.unit_price_ht) * item.quantity),
      0,
    ),
  );
  const shippingHT = roundMoney(Math.max(0, roundMoney(totalHT) - productsHT));
  return { productsHT, shippingHT };
}
