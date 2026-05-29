import {
  isSupplierAccessory,
  isSupplierKit,
  isSupplierLowUvDecimals,
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
    product_unite_de_vente: 100,
  };

  assertEqual(supplierElementQuantity(item, 1000), 4000, "element_quantity");
  assertEqual(supplierTarifUv(item, 55, 1000, 100), 5.5, "tarif_uv");
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
    product_unite_de_vente: 100,
  };

  assertEqual(supplierElementQuantity(unitItem, 1000), 50, "element_quantity");
  assertEqual(supplierTarifUv(unitItem, 55, 1000, 100), 5.5, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(unitItem, 55, 1000), 2.75, "purchase_line_total");
});

Deno.test("achat boîte box_quantity=1, unite_de_vente=100: tarif ×100", () => {
  const item = {
    quantity: 2,
    variant_id: "prod-coffret",
    product_purchase_price_ht: 23.7,
    product_box_quantity: 1,
    product_unite_de_vente: 100,
  };

  assertEqual(supplierTarifUv(item, 23.7, 1, 100), 2370, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 23.7, 1), 47.4, "purchase_line_total");
});

Deno.test("accessoire unite_de_vente=1: tarif_uv = purchase_price_ht", () => {
  const item = {
    quantity: 1,
    code_alsafix: "TOOLBS3A",
    variant_id: "prod-tool",
    product_purchase_price_ht: 23.7,
    product_box_quantity: 1,
    product_unite_de_vente: 1,
  };

  assertEqual(isSupplierAccessory(item), true, "is_accessory");
  assertEqual(isSupplierLowUvDecimals(item, 1), true, "low_uv_decimals");
  assertEqual(supplierElementQuantity(item, 1), 1, "element_quantity");
  assertEqual(supplierTarifUv(item, 23.7, 1, 1), 23.7, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 23.7, 1), 23.7, "purchase_line_total");
});

Deno.test("VBF30013: boîte 1000 vis — Tarif UV 0,55 (pas 1,00 par arrondi unitaire)", () => {
  const item = {
    quantity: 1,
    code_alsafix: "VBF30013",
    variant_id: "prod-vbf30013",
    product_purchase_price_ht: 5.5,
    product_box_quantity: 1000,
    product_unite_de_vente: 100,
  };

  assertEqual(supplierElementQuantity(item, 1000), 1000, "element_quantity");
  assertEqual(supplierTarifUv(item, 5.5, 1000, 100), 0.55, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 5.5, 1000), 5.5, "purchase_line_total");
});

Deno.test("kit unite_de_vente=1, box_quantity=1", () => {
  const item = {
    quantity: 2,
    code_alsafix: "KIT08822",
    variant_id: "prod-kit",
    product_purchase_price_ht: 61.99,
    product_box_quantity: 1,
    product_unite_de_vente: 1,
  };

  assertEqual(isSupplierKit(item), true, "is_kit");
  assertEqual(supplierElementQuantity(item, 1), 2, "element_quantity");
  assertEqual(supplierTarifUv(item, 61.99, 1, 1), 61.99, "tarif_uv");
  assertEqual(supplierPurchaseLineTotal(item, 61.99, 1), 123.98, "purchase_line_total");
});
