/** Totaux produits vs frais de port (HT) pour PDF / emails / suivi commande. */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { roundMoney } from "./money.ts";
import {
  DEFAULT_SHIPPING_CONFIG,
  type ShippingConfig,
} from "./shipping-config.ts";

const TVA_RATE = 0.2;

export type OrderTotalsLine = {
  priceHT?: number;
  unit_price_ht?: number;
  unit_price_ttc?: number;
  priceTTC?: number;
  quantity?: number;
  q?: number;
};

export function shippingFeeTtc(
  productsSubtotalTtc: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): number {
  return productsSubtotalTtc >= config.freeShippingThresholdTtc
    ? 0
    : config.defaultShippingFeeTtc;
}

/** Décompose un total TTC commande en produits + port selon la config fournisseur. */
export function decomposeOrderTotalTtc(
  totalTtc: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): { productsTTC: number; shippingTTC: number } {
  const total = roundMoney(totalTtc);
  const fee = config.defaultShippingFeeTtc;
  const threshold = config.freeShippingThresholdTtc;

  if (total <= 0) return { productsTTC: 0, shippingTTC: 0 };

  const productsWithStandardShipping = roundMoney(total - fee);
  if (
    productsWithStandardShipping >= 0 &&
    shippingFeeTtc(productsWithStandardShipping, config) === fee
  ) {
    return { productsTTC: productsWithStandardShipping, shippingTTC: fee };
  }

  if (total >= threshold) {
    return { productsTTC: total, shippingTTC: 0 };
  }

  return { productsTTC: total, shippingTTC: 0 };
}

export function sumItemsHT(items: OrderTotalsLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      const unit = roundMoney(item.priceHT ?? item.unit_price_ht ?? 0);
      const qty = item.quantity ?? item.q ?? 1;
      return sum + roundMoney(unit * qty);
    }, 0),
  );
}

export function sumItemsTTC(items: OrderTotalsLine[]): number {
  return roundMoney(
    items.reduce((sum, item) => {
      const unitHt = roundMoney(item.priceHT ?? item.unit_price_ht ?? 0);
      const unitTtc = roundMoney(
        item.priceTTC ?? item.unit_price_ttc ?? (unitHt > 0 ? unitHt * (1 + TVA_RATE) : 0),
      );
      const qty = item.quantity ?? item.q ?? 1;
      return sum + roundMoney(unitTtc * qty);
    }, 0),
  );
}

export function splitOrderTotals(
  items: OrderTotalsLine[],
  totalHT: number,
  totalTTC?: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): { productsHT: number; shippingHT: number } {
  const productsHT = sumItemsHT(items);
  const residualHT = roundMoney(Math.max(0, roundMoney(totalHT) - productsHT));

  const totalTtcResolved =
    totalTTC != null && Number.isFinite(totalTTC) && totalTTC > 0
      ? roundMoney(totalTTC)
      : roundMoney(productsHT * (1 + TVA_RATE) + residualHT);

  const { shippingTTC } = decomposeOrderTotalTtc(totalTtcResolved, config);
  const standardShippingHT = roundMoney(shippingTTC / (1 + TVA_RATE));
  const standardProductsHT = roundMoney(roundMoney(totalHT) - standardShippingHT);

  if (residualHT > standardShippingHT + 0.05 && standardProductsHT > productsHT + 0.05) {
    return { productsHT: standardProductsHT, shippingHT: standardShippingHT };
  }

  return { productsHT, shippingHT: residualHT };
}

/** Aligne les lignes affichées / facture quand unit_price_ht est en retard sur le total commande. */
export function normalizeInvoiceLineItems<T extends OrderTotalsLine & { unit_price_ht: number }>(
  items: T[],
  totalHT: number,
  totalTTC?: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): { items: T[]; productsHT: number; shippingHT: number } {
  const { productsHT, shippingHT } = splitOrderTotals(items, totalHT, totalTTC, config);
  const summedHT = sumItemsHT(items);

  if (summedHT <= 0 || Math.abs(summedHT - productsHT) <= 0.05) {
    return { items, productsHT, shippingHT };
  }

  const scale = productsHT / summedHT;
  const scaledItems = items.map((item) => ({
    ...item,
    unit_price_ht: roundMoney(item.unit_price_ht * scale),
  }));

  return { items: scaledItems, productsHT, shippingHT };
}

/** Recalcule unit_price_ht/ttc des lignes pour coller au total TTC (après paiement correctif admin). */
export async function syncOrderItemsToOrderTotal(
  supabaseAdmin: SupabaseClient,
  orderId: string,
  totalTtc: number,
  config: ShippingConfig = DEFAULT_SHIPPING_CONFIG,
): Promise<{ updated: number }> {
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select("id, quantity, unit_price_ht, unit_price_ttc")
    .eq("order_id", orderId);

  if (error) throw error;
  if (!items?.length) return { updated: 0 };

  const { productsTTC: targetProductsTTC } = decomposeOrderTotalTtc(totalTtc, config);
  const currentProductsTTC = roundMoney(
    items.reduce(
      (sum, row) =>
        sum + roundMoney(Number(row.unit_price_ttc ?? Number(row.unit_price_ht) * (1 + TVA_RATE))) *
          Number(row.quantity || 1),
      0,
    ),
  );

  if (currentProductsTTC <= 0) return { updated: 0 };

  const scale = targetProductsTTC / currentProductsTTC;
  if (!Number.isFinite(scale) || Math.abs(scale - 1) < 0.0001) {
    return { updated: 0 };
  }

  let updated = 0;
  for (const row of items) {
    const unitTtc = roundMoney(
      Number(row.unit_price_ttc ?? Number(row.unit_price_ht) * (1 + TVA_RATE)) * scale,
    );
    const unitHt = roundMoney(unitTtc / (1 + TVA_RATE));
    const { error: upErr } = await supabaseAdmin
      .from("order_items")
      .update({ unit_price_ht: unitHt, unit_price_ttc: unitTtc })
      .eq("id", row.id);
    if (upErr) throw upErr;
    updated += 1;
  }

  return { updated };
}
