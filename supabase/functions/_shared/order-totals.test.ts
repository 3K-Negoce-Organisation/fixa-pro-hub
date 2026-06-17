import {
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  decomposeOrderTotalTtc,
  normalizeInvoiceLineItems,
  splitOrderTotals,
} from "./order-totals.ts";

Deno.test("decomposeOrderTotalTtc — panier standard sous seuil", () => {
  assertEquals(decomposeOrderTotalTtc(42), { productsTTC: 30, shippingTTC: 12 });
  assertEquals(decomposeOrderTotalTtc(56), { productsTTC: 44, shippingTTC: 12 });
});

Deno.test("splitOrderTotals — lignes en retard sur total corrigé", () => {
  const items = [{ unit_price_ht: 25, quantity: 1 }];
  const result = splitOrderTotals(items, 46.67, 56);
  assertEquals(result.productsHT, 36.67);
  assertEquals(result.shippingHT, 10);
});

Deno.test("normalizeInvoiceLineItems — rescale les lignes facture", () => {
  const items = [{ unit_price_ht: 25, quantity: 1, product_title: "Test" }];
  const { items: scaled, productsHT, shippingHT } = normalizeInvoiceLineItems(
    items,
    46.67,
    56,
  );
  assertEquals(productsHT, 36.67);
  assertEquals(shippingHT, 10);
  assertEquals(scaled[0].unit_price_ht, 36.67);
});
