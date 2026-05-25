import {
  isSupplierKit,
  isSupplierUnitPurchase,
  supplierElementQuantity,
  supplierPurchaseLineTotal,
  supplierTarifUv,
  supplierUnitPurchasePrice,
} from "./order-supplier-quantity.ts";

function assertEqual(actual: number, expected: number, label: string) {
  if (Math.abs(actual - expected) > 1e-9) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

Deno.test("supplierUnitPurchasePrice: divise seulement si box_quantity > 1", () => {
  assertEqual(supplierUnitPurchasePrice(55, 1000), 0.055, "55 / 1000");
  assertEqual(supplierUnitPurchasePrice(23.7, 1), 23.7, "pas de division si box=1");
});

Deno.test("VBF30015: 4 boîtes × 1000 — Qté 4000, Tarif 5,50, Total 220", () => {
  const item = {
    quantity: 4,
    variant_title: "Unité",
    variant_id: "prod-123",
    product_purchase_price_ht: 55,
    product_box_quantity: 1000,
  };

  assertEqual(supplierElementQuantity(item, 1000), 4000, "element_quantity");
  assertEqual(supplierTarifUv(item, 55, 1000), 5.5, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 55, 1000), 220, "purchase_line_total");
  if (isSupplierUnitPurchase(item)) {
    throw new Error("variant_title Unité ne doit pas être traité comme achat unitaire");
  }
});

Deno.test("achat unitaire (-unit): Qté 50, Total 2,75", () => {
  const unitItem = {
    quantity: 50,
    variant_id: "prod-123-unit",
    product_purchase_price_ht: 55,
    product_box_quantity: 1000,
  };

  assertEqual(supplierElementQuantity(unitItem, 1000), 50, "element_quantity");
  assertEqual(supplierTarifUv(unitItem, 55, 1000), 5.5, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(unitItem, 55, 1000), 2.75, "purchase_line_total");
});

Deno.test("achat boîte box_quantity=1: nb boîtes × purchase_price_ht", () => {
  const item = {
    quantity: 2,
    variant_id: "prod-coffret",
    product_purchase_price_ht: 23.7,
    product_box_quantity: 1,
  };

  assertEqual(supplierTarifUv(item, 23.7, 1), 2370, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 23.7, 1), 47.4, "purchase_line_total");
});

Deno.test("kit KIT*: tarif_uv = purchase_price_ht, ignore box_quantity erroné", () => {
  const item = {
    quantity: 2,
    code_alsafix: "KIT08822",
    variant_id: "prod-kit",
    product_purchase_price_ht: 61.99,
    product_box_quantity: 2,
  };

  assertEqual(isSupplierKit(item), true, "is_kit");
  assertEqual(supplierElementQuantity(item, 2), 2, "element_quantity");
  assertEqual(supplierTarifUv(item, 61.99, 2), 61.99, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 61.99, 2), 123.98, "purchase_line_total");
});
