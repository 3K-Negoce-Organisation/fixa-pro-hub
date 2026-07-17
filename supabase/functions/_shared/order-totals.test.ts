import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decomposeOrderTotalTtc,
  normalizeInvoiceLineItems,
  splitOrderTotals,
} from "./order-totals.ts";
import { DEFAULT_SHIPPING_CONFIG } from "./shipping-config.ts";

const STANDARD_CONFIG = DEFAULT_SHIPPING_CONFIG;

Deno.test("decomposeOrderTotalTtc — panier standard sous seuil", () => {
  assertEquals(decomposeOrderTotalTtc(42, STANDARD_CONFIG), { productsTTC: 30, shippingTTC: 12 });
  assertEquals(decomposeOrderTotalTtc(56, STANDARD_CONFIG), { productsTTC: 44, shippingTTC: 12 });
});

Deno.test("splitOrderTotals — lignes en retard sur total corrigé", () => {
  const items = [{ unit_price_ht: 25, quantity: 1 }];
  const result = splitOrderTotals(items, 46.67, 56, STANDARD_CONFIG);
  assertEquals(result.productsHT, 36.67);
  assertEquals(result.shippingHT, 10);
});

Deno.test("normalizeInvoiceLineItems — rescale les lignes facture", () => {
  const items = [{ unit_price_ht: 25, quantity: 1, product_title: "Test" }];
  const { items: scaled, productsHT, shippingHT } = normalizeInvoiceLineItems(
    items,
    46.67,
    56,
    STANDARD_CONFIG,
  );
  assertEquals(productsHT, 36.67);
  assertEquals(shippingHT, 10);
  assertEquals(scaled[0].unit_price_ht, 36.67);
});

Deno.test("decomposeOrderTotalTtc — config personnalisée", () => {
  const custom = { freeShippingThresholdTtc: 100, defaultShippingFeeTtc: 8 };
  assertEquals(decomposeOrderTotalTtc(50, custom), { productsTTC: 42, shippingTTC: 8 });
  assertEquals(decomposeOrderTotalTtc(100, custom), { productsTTC: 100, shippingTTC: 0 });
});
