/** Totaux produits vs frais de port (HT) pour PDF / emails / suivi commande. */

export function sumItemsHT(items: Array<{ priceHT?: number; unit_price_ht?: number; quantity?: number; q?: number }>): number {
  return items.reduce((sum, item) => {
    const priceHT = item.priceHT ?? item.unit_price_ht ?? 0;
    const qty = item.quantity ?? item.q ?? 1;
    return sum + priceHT * qty;
  }, 0);
}

export function splitOrderTotals(
  items: Array<{ priceHT?: number; unit_price_ht?: number; quantity?: number; q?: number }>,
  totalHT: number,
): { productsHT: number; shippingHT: number } {
  const productsHT = Math.round(sumItemsHT(items) * 100) / 100;
  const shippingHT = Math.round(Math.max(0, totalHT - productsHT) * 100) / 100;
  return { productsHT, shippingHT };
}
