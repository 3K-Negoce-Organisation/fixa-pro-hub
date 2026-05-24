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
