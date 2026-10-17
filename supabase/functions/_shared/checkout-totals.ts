import { roundMoney } from "./money.ts";
import {
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from "./shipping-config.ts";

const TVA_RATE = 0.2;

export type CheckoutLine = {
  priceHT?: number;
  priceTTC?: number;
  quantity: number;
};

function lineUnitTTC(item: CheckoutLine): number {
  if (item.priceTTC != null && item.priceTTC > 0) {
    return roundMoney(item.priceTTC);
  }
  return roundMoney(roundMoney(item.priceHT ?? 0) * (1 + TVA_RATE));
}

function lineUnitHT(item: CheckoutLine): number {
  if (item.priceHT != null && item.priceHT > 0) {
    return roundMoney(item.priceHT);
  }
  return roundMoney(lineUnitTTC(item) / (1 + TVA_RATE));
}

function clientLineTotalTtc(priceTtc: number, quantity: number): number {
  return roundMoney(roundMoney(priceTtc) * quantity);
}

/** Port : 10 € HT sous 150 € HT de produits ; franco au-delà. */
export function shippingFeeHtFromProductsHt(
  productsHT: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  const threshold = config.freeShippingThresholdHt ?? config.freeShippingThresholdTtc;
  const feeHt = config.defaultShippingFeeHt ??
    roundMoney((config.defaultShippingFeeTtc ?? 0) / (1 + TVA_RATE));
  return productsHT >= threshold ? 0 : feeHt;
}

/** @deprecated — utiliser shippingFeeHtFromProductsHt + conversion TTC */
export function shippingFeeTtcFromConfig(
  subtotalTTC: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  // Approximation legacy (seuil TTC) — préférer computeCheckoutTotals
  return subtotalTTC >= (config.freeShippingThresholdTtc ?? 150)
    ? 0
    : (config.defaultShippingFeeTtc ?? 12);
}

export function computeCheckoutTotals(
  items: CheckoutLine[],
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
) {
  const productsHT = roundMoney(
    items.reduce(
      (sum, item) => sum + roundMoney(lineUnitHT(item) * item.quantity),
      0,
    ),
  );
  const productsTTC = roundMoney(
    items.reduce(
      (sum, item) => sum + clientLineTotalTtc(lineUnitTTC(item), item.quantity),
      0,
    ),
  );
  const subtotalTTC = productsTTC;
  const shippingHT = shippingFeeHtFromProductsHt(productsHT, config);
  const shippingTTC = shippingHT > 0
    ? roundMoney(shippingHT * (1 + TVA_RATE))
    : 0;
  const totalHT = roundMoney(productsHT + shippingHT);
  const totalTTC = roundMoney(subtotalTTC + shippingTTC);
  return { productsHT, subtotalTTC, shippingTTC, shippingHT, totalHT, totalTTC };
}
