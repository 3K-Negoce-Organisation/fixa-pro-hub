import {
  isSupplierUnitPurchase,
  supplierElementQuantity,
  supplierPurchaseLineTotal,
  supplierTarifUv,
} from "./order-supplier-quantity.ts";

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

const vbfBoxItem = {
  quantity: 4,
  variant_title: "Unité",
  variant_id: "prod-123",
  purchase_price_ht: 55,
  box_quantity: 1000,
};

Deno.test("VBF30015: 4 boîtes × 1000 — Qté 4000, Tarif 5,50, Total 220", () => {
  assertEqual(supplierElementQuantity(vbfBoxItem, 1000), 4000, "element_quantity");
  assertEqual(supplierTarifUv(vbfBoxItem, 55, 1000), 5.5, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(vbfBoxItem, 55, 1000), 220, "purchase_line_total");
  if (isSupplierUnitPurchase(vbfBoxItem)) {
    throw new Error("variant_title Unité ne doit pas être traité comme achat unitaire");
  }
});

Deno.test("achat unitaire (-unit): Qté 50, Total 2,75", () => {
  const unitItem = {
    quantity: 50,
    variant_id: "prod-123-unit",
    purchase_price_ht: 55,
    box_quantity: 1000,
  };
  if (!isSupplierUnitPurchase(unitItem)) {
    throw new Error("variant_id -unit doit être achat unitaire");
  }
  assertEqual(supplierElementQuantity(unitItem, 1000), 50, "element_quantity");
  assertEqual(supplierTarifUv(unitItem, 55, 1000), 5.5, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(unitItem, 55, 1000), 2.75, "purchase_line_total");
});

Deno.test("sans box_quantity: Qté = cart, tarif = PA × 100", () => {
  const item = { quantity: 3, purchase_price_ht: 2.5 };
  assertEqual(supplierElementQuantity(item, null), 3, "element_quantity");
  assertEqual(supplierTarifUv(item, 2.5, null), 250, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 2.5, null), 7.5, "purchase_line_total");
});
