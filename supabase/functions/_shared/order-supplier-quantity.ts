const UV_BATCH = 100;

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Achat unitaire PDF fournisseur : uniquement si variant_id se termine par "-unit". */
export function isSupplierUnitPurchase(item: Record<string, unknown>): boolean {
  const variantId = String(item.variant_id ?? item.variantId ?? "");
  return variantId.endsWith("-unit");
}

/** Kit Alsafix : code_alsafix commence par KIT (ex. KIT08822, KIT-VBF60). Tarif UV = purchase_price_ht. */
export function isSupplierKit(item: Record<string, unknown>): boolean {
  const code = String(item.code_alsafix ?? item.codeAlsafix ?? "").trim().toUpperCase();
  return code.startsWith("KIT");
}

/** @deprecated Utiliser isSupplierUnitPurchase pour le PDF fournisseur. */
export function isUnitVariant(item: Record<string, unknown>): boolean {
  return isSupplierUnitPurchase(item);
}

function cartQuantity(item: Record<string, unknown>): number {
  const cartQty = Number(item.quantity ?? item.q ?? 1);
  return Number.isFinite(cartQty) && cartQty > 0 ? cartQty : 1;
}

/** Valeurs issues exclusivement de la table products (enrichissement). */
export function resolveProductBoxQuantity(item: Record<string, unknown>, boxQuantity?: number | null): number {
  const perBox = Number(boxQuantity ?? item.product_box_quantity ?? item.box_quantity ?? 0);
  return Number.isFinite(perBox) && perBox > 0 ? perBox : 1;
}

export function resolveProductPurchasePrice(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
): number {
  const purchase = Number(purchasePriceHt ?? item.product_purchase_price_ht ?? item.purchase_price_ht ?? 0);
  return Number.isFinite(purchase) && purchase > 0 ? purchase : 0;
}

/**
 * Prix d'achat HT par unité (products.purchase_price_ht / products.box_quantity si box_quantity > 1).
 */
export function supplierUnitPurchasePrice(
  purchasePriceHt: number,
  boxQuantity?: number | null,
): number {
  if (purchasePriceHt <= 0) return 0;
  const boxQty = Number(boxQuantity ?? 0);
  if (Number.isFinite(boxQty) && boxQty > 1) {
    return purchasePriceHt / boxQty;
  }
  return purchasePriceHt;
}

/**
 * Quantité en éléments pour le PDF / le fournisseur :
 * - boîte : nb boîtes × box_quantity (ex. 4 × 1000 = 4000)
 * - unité (-unit) : quantité achetée telle quelle
 */
export function supplierElementQuantity(
  item: Record<string, unknown>,
  boxQuantity?: number | null,
): number {
  const safeCartQty = cartQuantity(item);
  if (isSupplierKit(item) || isSupplierUnitPurchase(item)) return safeCartQty;

  const perBox = resolveProductBoxQuantity(item, boxQuantity);
  if (perBox > 1) return safeCartQty * perBox;

  return safeCartQty;
}

/**
 * Tarif UV :
 * - kit (KIT-*) : purchase_price_ht tel quel
 * - boîte / unité : prix pour 100 unités = prix unitaire × 100
 */
export function supplierTarifUv(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const purchase = resolveProductPurchasePrice(item, purchasePriceHt);
  if (purchase <= 0) return 0;

  if (isSupplierKit(item)) return purchase;

  const boxQty = resolveProductBoxQuantity(item, boxQuantity);
  return supplierUnitPurchasePrice(purchase, boxQty) * UV_BATCH;
}

/**
 * Prix total HT net :
 * - achat unitaire : qté unités × (purchase_price_ht / box_quantity)
 * - achat boîte : nb boîtes × purchase_price_ht
 * (équivalent à qté unités × prix unitaire)
 */
export function supplierPurchaseLineTotal(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): number {
  const purchase = resolveProductPurchasePrice(item, purchasePriceHt);
  if (purchase <= 0) return 0;

  if (isSupplierKit(item)) {
    return cartQuantity(item) * purchase;
  }

  const boxQty = resolveProductBoxQuantity(item, boxQuantity);
  const unitPrice = supplierUnitPurchasePrice(purchase, boxQty);

  if (isSupplierUnitPurchase(item)) {
    return cartQuantity(item) * unitPrice;
  }

  if (boxQty > 1) {
    return cartQuantity(item) * purchase;
  }

  return supplierElementQuantity(item, boxQty) * unitPrice;
}

export function enrichItemSupplierPricing(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
): Record<string, unknown> {
  const productPurchase = purchasePriceHt ?? null;
  const productBoxQty = boxQuantity ?? null;

  const enrichedItem = {
    ...item,
    product_purchase_price_ht: productPurchase,
    product_box_quantity: productBoxQty,
    purchase_price_ht: productPurchase,
    box_quantity: productBoxQty,
  };

  return {
    ...enrichedItem,
    is_kit: isSupplierKit(enrichedItem),
    element_quantity: supplierElementQuantity(enrichedItem, productBoxQty),
    tarif_uv: supplierTarifUv(enrichedItem, productPurchase, productBoxQty),
    purchase_line_total: supplierPurchaseLineTotal(enrichedItem, productPurchase, productBoxQty),
  };
}

/** Arrondi monétaire pour les totaux pied de page PDF uniquement. */
export function roundPdfFooterMoney(value: number): number {
  return roundMoney(value);
}
