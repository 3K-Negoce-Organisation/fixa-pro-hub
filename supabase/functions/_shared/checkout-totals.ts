import { roundMoney } from "./money.ts";

const TVA_RATE = 0.2;
const FREE_SHIPPING_THRESHOLD_TTC = 150;
const SHIPPING_FEE_TTC = 12;

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

export function computeCheckoutTotals(items: CheckoutLine[]) {
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
  const shippingTTC = subtotalTTC >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : SHIPPING_FEE_TTC;
  const shippingHT = shippingTTC > 0 ? roundMoney(SHIPPING_FEE_TTC / (1 + TVA_RATE)) : 0;
  const totalHT = roundMoney(productsHT + shippingHT);
  const totalTTC = roundMoney(subtotalTTC + shippingTTC);
  return { productsHT, subtotalTTC, shippingTTC, shippingHT, totalHT, totalTTC };
}
