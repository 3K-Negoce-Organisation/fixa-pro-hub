/** TVA incluse dans les prix affichés et les seuils ci-dessous */

export const TVA_RATE = 0.2;

/** Livraison offerte à partir de ce montant TTC (produits uniquement, hors frais de port) */
export const FREE_SHIPPING_THRESHOLD_TTC = 150;

/** Frais de port facturés en TTC si le sous-total produits TTC est strictement inférieur au seuil */
export const SHIPPING_FEE_TTC = 12;

export function cartSubtotalTTC(productsHT: number): number {
  return productsHT * (1 + TVA_RATE);
}

export function shippingFeeTTC(subtotalTTC: number): number {
  return subtotalTTC >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : SHIPPING_FEE_TTC;
}

export function shippingFeeHT(subtotalTTC: number): number {
  return shippingFeeTTC(subtotalTTC) / (1 + TVA_RATE);
}

export function orderGrandTotals(productsHT: number) {
  const subtotalTTC = cartSubtotalTTC(productsHT);
  const shippingTTC = shippingFeeTTC(subtotalTTC);
  const grandTotalTTC = subtotalTTC + shippingTTC;
  const shippingHT = shippingFeeHT(subtotalTTC);
  const grandTotalHT = productsHT + shippingHT;
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
  const productsHT = Math.round(
    items.reduce((sum, item) => sum + item.unit_price_ht * item.quantity, 0) * 100,
  ) / 100;
  const shippingHT = Math.round(Math.max(0, totalHT - productsHT) * 100) / 100;
  return { productsHT, shippingHT };
}
