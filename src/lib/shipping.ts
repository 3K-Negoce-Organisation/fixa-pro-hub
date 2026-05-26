/** TVA incluse dans les prix affichés et les seuils ci-dessous */

import { roundMoney } from "@/lib/utils";

export const TVA_RATE = 0.2;

/** Livraison offerte à partir de ce montant TTC (produits uniquement, hors frais de port) */
export const FREE_SHIPPING_THRESHOLD_TTC = 150;

/** Frais de port facturés en TTC si le sous-total produits TTC est strictement inférieur au seuil */
export const SHIPPING_FEE_TTC = 12;

/** @deprecated Préférer le sous-total TTC issu de `cartProductsTTC` (price_ttc). */
export function cartSubtotalTTC(productsHT: number): number {
  return roundMoney(roundMoney(productsHT) * (1 + TVA_RATE));
}

export function shippingFeeTTC(subtotalTTC: number): number {
  return subtotalTTC >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : SHIPPING_FEE_TTC;
}

export function shippingFeeHT(subtotalTTC: number): number {
  return roundMoney(shippingFeeTTC(subtotalTTC) / (1 + TVA_RATE));
}

/** Totaux commande : sous-total produits en TTC catalogue (price_ttc). */
export function orderGrandTotals(productsTTC: number, productsHT?: number) {
  const subtotalTTC = roundMoney(productsTTC);
  const roundedProductsHT = roundMoney(
    productsHT ?? roundMoney(subtotalTTC / (1 + TVA_RATE)),
  );
  const shippingTTC = shippingFeeTTC(subtotalTTC);
  const grandTotalTTC = roundMoney(subtotalTTC + shippingTTC);
  const shippingHT = shippingFeeHT(subtotalTTC);
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
    items.reduce((sum, item) => sum + roundMoney(item.unit_price_ht) * item.quantity, 0),
  );
  const shippingHT = roundMoney(Math.max(0, roundMoney(totalHT) - productsHT));
  return { productsHT, shippingHT };
}
