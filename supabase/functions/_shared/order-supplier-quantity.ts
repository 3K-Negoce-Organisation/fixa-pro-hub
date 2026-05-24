const UV_BATCH = 100;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Achat à l'unité (pas au conditionnement boîte). */
export function isUnitVariant(item: Record<string, unknown>): boolean {
  const title = String(item.variant_title ?? item.variantTitle ?? "").trim().toLowerCase();
  if (title === "unité" || title === "unite") return true;
  const variantId = String(item.variant_id ?? item.variantId ?? "");
  return variantId.endsWith("-unit");
}

/**
 * Quantité en éléments pour le PDF / le fournisseur :
 * - boîte : nb boîtes × quantité par boîte (ex. 10 × 1000 = 10000)
 * - unité : quantité achetée telle quelle
 */
export function supplierElementQuantity(
  item: Record<string, unknown>,
  boxQuantity?: number | null,
): number {
  const cartQty = Number(item.quantity ?? item.q ?? 1);
  const safeCartQty = Number.isFinite(cartQty) && cartQty > 0 ? cartQty : 1;

  if (isUnitVariant(item)) return safeCartQty;

  const perBox = Number(boxQuantity ?? item.box_quantity ?? 0);
  if (Number.isFinite(perBox) && perBox > 0) return safeCartQty * perBox;

  return safeCartQty;
}

/**
 * Tarif UV = prix d'achat ramené à 100 unités.
 * Ex. PA boîte 5,50 € pour 1000 vis → 5,50 / 1000 × 100 = 0,55 €.
 */
export function supplierTarifUv(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const purchase = Number(purchasePriceHt ?? item.purchase_price_ht ?? 0);
  if (!Number.isFinite(purchase) || purchase <= 0) return 0;

  const perBox = Number(boxQuantity ?? item.box_quantity ?? 0);
  if (perBox > 0) return roundMoney((purchase / perBox) * UV_BATCH);

  return roundMoney(purchase * UV_BATCH);
}

/** Total HT net fournisseur pour la ligne (PA × nb conditionnements ou PA unitaire × qté). */
export function supplierPurchaseLineTotal(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const cartQty = Number(item.quantity ?? item.q ?? 1);
  const safeCartQty = Number.isFinite(cartQty) && cartQty > 0 ? cartQty : 1;
  const purchase = Number(purchasePriceHt ?? item.purchase_price_ht ?? 0);
  if (!Number.isFinite(purchase) || purchase <= 0) return 0;

  if (isUnitVariant(item)) {
    const perBox = Number(boxQuantity ?? item.box_quantity ?? 0);
    const unitPurchase = perBox > 0 ? purchase / perBox : purchase;
    return roundMoney(safeCartQty * unitPurchase);
  }

  return roundMoney(safeCartQty * purchase);
}

export function enrichItemSupplierPricing(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): Record<string, unknown> {
  const boxQty = boxQuantity ?? item.box_quantity ?? null;
  const purchase = purchasePriceHt ?? item.purchase_price_ht ?? null;
  return {
    ...item,
    purchase_price_ht: purchase,
    box_quantity: boxQty,
    element_quantity: supplierElementQuantity(item, boxQty as number | null | undefined),
    tarif_uv: supplierTarifUv(item, purchase as number | null | undefined, boxQty as number | null | undefined),
    purchase_line_total: supplierPurchaseLineTotal(item, purchase as number | null | undefined, boxQty as number | null | undefined),
  };
}
