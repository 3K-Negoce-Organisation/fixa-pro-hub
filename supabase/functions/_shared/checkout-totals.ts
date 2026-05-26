import { roundMoney } from "./money.ts";

const TVA_RATE = 0.2;
const FREE_SHIPPING_THRESHOLD_TTC = 150;
const SHIPPING_FEE_TTC = 12;

export function computeCheckoutTotals(items: Array<{ priceHT: number; quantity: number }>) {
  const productsHT = roundMoney(
    items.reduce((sum, item) => sum + roundMoney(item.priceHT) * item.quantity, 0),
  );
  const subtotalTTC = roundMoney(productsHT * (1 + TVA_RATE));
  const shippingTTC = subtotalTTC >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : SHIPPING_FEE_TTC;
  const shippingHT = shippingTTC > 0 ? roundMoney(SHIPPING_FEE_TTC / (1 + TVA_RATE)) : 0;
  const totalHT = roundMoney(productsHT + shippingHT);
  const totalTTC = roundMoney(subtotalTTC + shippingTTC);
  return { productsHT, subtotalTTC, shippingTTC, shippingHT, totalHT, totalTTC };
}
