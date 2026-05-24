const UV_BATCH = 100;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Achat unitaire PDF fournisseur : uniquement si variant_id se termine par "-unit". */
export function isSupplierUnitPurchase(item: Record<string, unknown>): boolean {
  const variantId = String(item.variant_id ?? item.variantId ?? "");
  return variantId.endsWith("-unit");
}

/** @deprecated Utiliser isSupplierUnitPurchase pour le PDF fournisseur. */
export function isUnitVariant(item: Record<string, unknown>): boolean {
  return isSupplierUnitPurchase(item);
}

function cartQuantity(item: Record<string, unknown>): number {
  const cartQty = Number(item.quantity ?? item.q ?? 1);
  return Number.isFinite(cartQty) && cartQty > 0 ? cartQty : 1;
}

function resolveBoxQuantity(item: Record<string, unknown>, boxQuantity?: number | null): number {
  const perBox = Number(boxQuantity ?? item.box_quantity ?? 0);
  return Number.isFinite(perBox) && perBox > 0 ? perBox : 0;
}

function resolvePurchasePrice(item: Record<string, unknown>, purchasePriceHt?: number | null): number {
  const purchase = Number(purchasePriceHt ?? item.purchase_price_ht ?? 0);
  return Number.isFinite(purchase) && purchase > 0 ? purchase : 0;
}

/**
 * Quantité en éléments pour le PDF / le fournisseur :
 * - boîte : nb boîtes × quantité par boîte (ex. 4 × 1000 = 4000)
 * - unité (-unit) : quantité achetée telle quelle
 */
export function supplierElementQuantity(
  item: Record<string, unknown>,
  boxQuantity?: number | null,
): number {
  const safeCartQty = cartQuantity(item);
  if (isSupplierUnitPurchase(item)) return safeCartQty;

  const perBox = resolveBoxQuantity(item, boxQuantity);
  if (perBox > 0) return safeCartQty * perBox;

  return safeCartQty;
}

/**
 * Tarif UV = prix d'achat ramené à 100 unités.
 * Ex. PA boîte 55 € pour 1000 vis → 55 / 1000 × 100 = 5,50 €.
 */
export function supplierTarifUv(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const purchase = resolvePurchasePrice(item, purchasePriceHt);
  if (purchase <= 0) return 0;

  const perBox = resolveBoxQuantity(item, boxQuantity);
  if (perBox > 0) return (purchase / perBox) * UV_BATCH;

  return purchase * UV_BATCH;
}

/** Total HT net fournisseur pour la ligne (PA boîte × nb boîtes ou PA unitaire × qté). */
export function supplierPurchaseLineTotal(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const safeCartQty = cartQuantity(item);
  const purchase = resolvePurchasePrice(item, purchasePriceHt);
  if (purchase <= 0) return 0;

  if (isSupplierUnitPurchase(item)) {
    const perBox = resolveBoxQuantity(item, boxQuantity);
    const unitPurchase = perBox > 0 ? purchase / perBox : purchase;
    return safeCartQty * unitPurchase;
  }

  return safeCartQty * purchase;
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

/** Arrondi monétaire pour les totaux pied de page PDF uniquement. */
export function roundPdfFooterMoney(value: number): number {
  return roundMoney(value);
}
