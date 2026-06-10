import { enrichItemSupplierPricing } from "./order-supplier-quantity.ts";
import { orderItemHasFrozenSnapshot } from "./order-item-snapshot.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Code article Alsafix uniquement — jamais d'UUID produit en repli. */
export function alsafixCodeOnly(code: string | null | undefined): string {
  if (!code?.trim()) return "";
  const trimmed = code.trim();
  if (UUID_RE.test(trimmed)) return "";
  return trimmed;
}

type ProductPricingRow = {
  id: string;
  code_alsafix?: string | null;
  box_quantity?: number | null;
  purchase_price_ht?: number | null;
  unite_de_vente?: number | null;
};

function resolveProductForItem(
  productId: string | undefined,
  code: string,
  productById: Map<string, ProductPricingRow>,
  productByCode: Map<string, ProductPricingRow>,
): ProductPricingRow | undefined {
  if (productId && productById.has(productId)) {
    return productById.get(productId);
  }
  if (code && productByCode.has(code)) {
    return productByCode.get(code);
  }
  return undefined;
}

function enrichFromFrozenSnapshot(item: Record<string, unknown>): Record<string, unknown> {
  const code = alsafixCodeOnly(item.code_alsafix as string | undefined);
  return enrichItemSupplierPricing(
    { ...item, code_alsafix: code },
    (item.snapshot_purchase_price_ht ?? item.purchase_price_ht) as number | null,
    (item.box_quantity ?? item.product_box_quantity) as number | null,
    (item.snapshot_unite_de_vente ?? item.unite_de_vente) as number | null,
  );
}

export async function enrichItemsWithAlsafixCodes(
  supabaseAdmin: any,
  items: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const results: Array<Record<string, unknown> | undefined> = new Array(items.length);
  const liveLookupItems: Array<{ index: number; item: Record<string, unknown> }> = [];

  items.forEach((item, index) => {
    if (orderItemHasFrozenSnapshot(item)) {
      results[index] = enrichFromFrozenSnapshot(item);
    } else {
      liveLookupItems.push({ index, item });
    }
  });

  if (liveLookupItems.length === 0) {
    return results as Array<Record<string, unknown>>;
  }

  const productIds = [
    ...new Set(
      liveLookupItems
        .map(({ item }) => (item.product_id || item.id) as string | undefined)
        .filter(Boolean),
    ),
  ] as string[];

  const codes = [
    ...new Set(
      liveLookupItems
        .map(({ item }) => alsafixCodeOnly(item.code_alsafix as string | undefined))
        .filter(Boolean),
    ),
  ] as string[];

  const productById = new Map<string, ProductPricingRow>();
  const productByCode = new Map<string, ProductPricingRow>();

  if (productIds.length > 0) {
    const { data: productsById } = await supabaseAdmin
      .from("products")
      .select("id, code_alsafix, box_quantity, purchase_price_ht, unite_de_vente")
      .in("id", productIds);

    for (const product of productsById || []) {
      productById.set(product.id, product);
      const productCode = alsafixCodeOnly(product.code_alsafix);
      if (productCode) productByCode.set(productCode, product);
    }
  }

  const missingCodes = codes.filter((code) => !productByCode.has(code));
  if (missingCodes.length > 0) {
    const { data: productsByCode } = await supabaseAdmin
      .from("products")
      .select("id, code_alsafix, box_quantity, purchase_price_ht, unite_de_vente")
      .in("code_alsafix", missingCodes);

    for (const product of productsByCode || []) {
      productById.set(product.id, product);
      const productCode = alsafixCodeOnly(product.code_alsafix);
      if (productCode) productByCode.set(productCode, product);
    }
  }

  for (const { index, item } of liveLookupItems) {
    const productId = (item.product_id || item.id) as string | undefined;
    const code = alsafixCodeOnly(item.code_alsafix as string | undefined);
    const product = resolveProductForItem(productId, code, productById, productByCode);
    const resolvedCode = (product && alsafixCodeOnly(product.code_alsafix)) || code || "";

    const variantId = String(item.variant_id ?? item.variantId ?? "");
    const isUnitPurchase = variantId.endsWith("-unit");
    if (product && !isUnitPurchase) {
      if (product.box_quantity == null || product.box_quantity <= 0) {
        console.warn("[PDF-SUPPLIER] box_quantity manquant dans products", {
          productId: product.id,
          code: resolvedCode,
        });
      }
      if (product.purchase_price_ht == null || product.purchase_price_ht <= 0) {
        console.warn("[PDF-SUPPLIER] purchase_price_ht manquant dans products", {
          productId: product.id,
          code: resolvedCode,
        });
      }
    }

    if (!product) {
      console.warn("[PDF-SUPPLIER] produit introuvable dans products", {
        productId,
        code: resolvedCode,
      });
    }

    results[index] = enrichItemSupplierPricing(
      { ...item, code_alsafix: resolvedCode },
      product?.purchase_price_ht ?? null,
      product?.box_quantity ?? null,
      product?.unite_de_vente ?? null,
    );
  }

  return results as Array<Record<string, unknown>>;
}
