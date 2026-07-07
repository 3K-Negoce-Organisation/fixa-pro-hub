import { roundMoney } from "./money.ts";
import {
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from "./shipping-config.ts";

const TVA_RATE = 0.2;

type CheckoutLine = {
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

function clientLineTotalTtc(priceTtc: number, quantity: number): number {
  return roundMoney(roundMoney(priceTtc) * quantity);
}

export function shippingFeeTtcFromConfig(
  subtotalTTC: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  return subtotalTTC >= config.freeShippingThresholdTtc ? 0 : config.defaultShippingFeeTtc;
}

export function computeCheckoutTotals(
  items: CheckoutLine[],
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
) {
  const productsTTC = roundMoney(
    items.reduce(
      (sum, item) => sum + clientLineTotalTtc(lineUnitTTC(item), item.quantity),
      0,
    ),
  );
  const productsHT = roundMoney(
    items.reduce((sum, item) => {
      const unitTtc = lineUnitTTC(item);
      return sum + roundMoney(unitTtc / (1 + TVA_RATE)) * item.quantity;
    }, 0),
  );
  const subtotalTTC = productsTTC;
  const shippingTTC = shippingFeeTtcFromConfig(subtotalTTC, config);
  const shippingHT = shippingTTC > 0
    ? roundMoney(config.defaultShippingFeeTtc / (1 + TVA_RATE))
    : 0;
  const totalHT = roundMoney(productsHT + shippingHT);
  const totalTTC = roundMoney(subtotalTTC + shippingTTC);
  return { productsHT, subtotalTTC, shippingTTC, shippingHT, totalHT, totalTTC };
}
