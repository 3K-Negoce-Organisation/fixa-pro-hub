/** Totaux produits vs frais de port (HT) pour PDF / emails / suivi commande. */

import { roundMoney } from "./money.ts";

export function sumItemsHT(items: Array<{ priceHT?: number; unit_price_ht?: number; quantity?: number; q?: number }>): number {
  return roundMoney(
    items.reduce((sum, item) => {
      const priceHT = roundMoney(item.priceHT ?? item.unit_price_ht ?? 0);
      const qty = item.quantity ?? item.q ?? 1;
      return sum + priceHT * qty;
    }, 0),
  );
}

export function splitOrderTotals(
  items: Array<{ priceHT?: number; unit_price_ht?: number; quantity?: number; q?: number }>,
  totalHT: number,
): { productsHT: number; shippingHT: number } {
  const productsHT = sumItemsHT(items);
  const shippingHT = roundMoney(Math.max(0, roundMoney(totalHT) - productsHT));
  return { productsHT, shippingHT };
}
