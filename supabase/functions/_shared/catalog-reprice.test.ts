import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeCheckoutTotals, shippingFeeHtFromProductsHt } from "./checkout-totals.ts";
import { DEFAULT_SHIPPING_CONFIG } from "./shipping-config.ts";
import { assertStripeAmountMatchesTotal, CatalogRepriceError } from "./catalog-reprice.ts";

Deno.test("port HT — sous 150 € HT → 10 € HT", () => {
  assertEquals(shippingFeeHtFromProductsHt(100, DEFAULT_SHIPPING_CONFIG), 10);
  assertEquals(shippingFeeHtFromProductsHt(149.99, DEFAULT_SHIPPING_CONFIG), 10);
});

Deno.test("port HT — franco à partir de 150 € HT", () => {
  assertEquals(shippingFeeHtFromProductsHt(150, DEFAULT_SHIPPING_CONFIG), 0);
  assertEquals(shippingFeeHtFromProductsHt(200, DEFAULT_SHIPPING_CONFIG), 0);
});

Deno.test("totaux ignorent un prix client manipulé si on force le catalogue", () => {
  // Simule lignes déjà repricées catalogue (prix serveur)
  const catalogLines = [
    { priceHT: 50, priceTTC: 60, quantity: 2 },
  ];
  const totals = computeCheckoutTotals(catalogLines, DEFAULT_SHIPPING_CONFIG);
  assertEquals(totals.productsHT, 100);
  assertEquals(totals.shippingHT, 10);
  assertEquals(totals.totalHT, 110);
  assertEquals(totals.shippingTTC, 12);
  assertEquals(totals.totalTTC, 132);

  // Même panier avec prix client 0.01 — si on utilisait ces prix ce serait faux ;
  // le serveur ne doit jamais les passer à computeCheckoutTotals.
  const tampered = [{ priceHT: 0.01, priceTTC: 0.01, quantity: 2 }];
  const bad = computeCheckoutTotals(tampered, DEFAULT_SHIPPING_CONFIG);
  // Preuve que 0,01 € changerait le total → d'où l'obligation de reprice catalogue
  assertEquals(bad.productsHT < 1, true);
  assertEquals(bad.totalTTC !== totals.totalTTC, true);
});

Deno.test("assertStripeAmountMatchesTotal refuse un écart", () => {
  assertThrows(
    () => assertStripeAmountMatchesTotal(132, 1),
    CatalogRepriceError,
  );
  assertStripeAmountMatchesTotal(132, 13200);
});
