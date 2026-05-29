import { roundMoney } from "./money.ts";

const DEFAULT_UNITE_DE_VENTE = 100;

/** Achat unitaire PDF fournisseur : uniquement si variant_id se termine par "-unit". */
export function isSupplierUnitPurchase(item: Record<string, unknown>): boolean {
  const variantId = String(item.variant_id ?? item.variantId ?? "");
  return variantId.endsWith("-unit");
}

function supplierAlsafixCode(item: Record<string, unknown>): string {
  return String(item.code_alsafix ?? item.codeAlsafix ?? "").trim().toUpperCase();
}

/** Kit Alsafix : code_alsafix commence par KIT (indicateur métier / admin). */
export function isSupplierKit(item: Record<string, unknown>): boolean {
  return supplierAlsafixCode(item).startsWith("KIT");
}

/** Accessoire Alsafix : code_alsafix commence par TOOL (indicateur métier / admin). */
export function isSupplierAccessory(item: Record<string, unknown>): boolean {
  return supplierAlsafixCode(item).startsWith("TOOL");
}

/**
 * Unité de vente Alsafix (products.unite_de_vente) pour le Tarif UV.
 * Défaut 100 = lot de 100 unités (vis standard).
 */
export function resolveUniteDeVente(
  item: Record<string, unknown>,
  uniteDeVente?: number | null,
): number {
  const uv = Number(
    uniteDeVente ?? item.product_unite_de_vente ?? item.unite_de_vente ?? DEFAULT_UNITE_DE_VENTE,
  );
  return Number.isFinite(uv) && uv > 0 ? uv : DEFAULT_UNITE_DE_VENTE;
}

/** Tarif UV affiché avec 2 décimales quand unite_de_vente = 1 (kits, accessoires, etc.). */
export function isSupplierLowUvDecimals(
  item: Record<string, unknown>,
  uniteDeVente?: number | null,
): boolean {
  return resolveUniteDeVente(item, uniteDeVente) === 1;
}

/** @deprecated Utiliser resolveUniteDeVente / isSupplierLowUvDecimals. */
export function isSupplierSingleUvTariff(item: Record<string, unknown>): boolean {
  return isSupplierLowUvDecimals(item);
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
    return roundMoney(purchasePriceHt / boxQty);
  }
  return roundMoney(purchasePriceHt);
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
  if (isSupplierUnitPurchase(item)) return safeCartQty;

  const perBox = resolveProductBoxQuantity(item, boxQuantity);
  if (perBox > 1) return safeCartQty * perBox;

  return safeCartQty;
}

/**
 * Tarif UV : (purchase_price_ht / box_quantity) × unite_de_vente
 */
export function supplierTarifUv(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
  uniteDeVente?: number | null,
): number {
  const purchase = resolveProductPurchasePrice(item, purchasePriceHt);
  if (purchase <= 0) return 0;

  const boxQty = resolveProductBoxQuantity(item, boxQuantity);
  const salesUnit = resolveUniteDeVente(item, uniteDeVente);
  return roundMoney(supplierUnitPurchasePrice(purchase, boxQty) * salesUnit);
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

  const boxQty = resolveProductBoxQuantity(item, boxQuantity);
  const unitPrice = supplierUnitPurchasePrice(purchase, boxQty);

  if (isSupplierUnitPurchase(item)) {
    return roundMoney(cartQuantity(item) * unitPrice);
  }

  if (boxQty > 1) {
    return roundMoney(cartQuantity(item) * purchase);
  }

  return roundMoney(supplierElementQuantity(item, boxQty) * unitPrice);
}

export function enrichItemSupplierPricing(
  item: Record<string, unknown>,
  purchasePriceHt?: number | null,
  boxQuantity?: number | null,
  uniteDeVente?: number | null,
): Record<string, unknown> {
  const productPurchase = purchasePriceHt ?? null;
  const productBoxQty = boxQuantity ?? null;
  const productUniteDeVente = uniteDeVente ?? null;

  const enrichedItem = {
    ...item,
    product_purchase_price_ht: productPurchase,
    product_box_quantity: productBoxQty,
    product_unite_de_vente: productUniteDeVente,
    purchase_price_ht: productPurchase,
    box_quantity: productBoxQty,
    unite_de_vente: productUniteDeVente,
  };

  return {
    ...enrichedItem,
    is_kit: isSupplierKit(enrichedItem),
    is_accessory: isSupplierAccessory(enrichedItem),
    is_single_uv_tariff: isSupplierLowUvDecimals(enrichedItem, productUniteDeVente),
    element_quantity: supplierElementQuantity(enrichedItem, productBoxQty),
    tarif_uv: roundMoney(
      supplierTarifUv(enrichedItem, productPurchase, productBoxQty, productUniteDeVente),
    ),
    purchase_line_total: roundMoney(
      supplierPurchaseLineTotal(enrichedItem, productPurchase, productBoxQty),
    ),
  };
}

/** Arrondi monétaire pour les totaux pied de page PDF. */
export function roundPdfFooterMoney(value: number): number {
  return roundMoney(value);
}
