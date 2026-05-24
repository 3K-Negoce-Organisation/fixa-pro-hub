import { supplierElementQuantity } from "./order-supplier-quantity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Code article Alsafix uniquement — jamais d'UUID produit en repli. */
export function alsafixCodeOnly(code: string | null | undefined): string {
  if (!code?.trim()) return "";
  const trimmed = code.trim();
  if (UUID_RE.test(trimmed)) return "";
  return trimmed;
}

export async function enrichItemsWithAlsafixCodes(
  supabaseAdmin: any,
  items: Array<Record<string, unknown>>,
): Promise<Array<Record<string, unknown>>> {
  const productIds = [
    ...new Set(
      items
        .map((item) => (item.product_id || item.id) as string | undefined)
        .filter(Boolean),
    ),
  ] as string[];

  if (productIds.length === 0) {
    return items.map((item) => ({
      ...item,
      code_alsafix: alsafixCodeOnly(item.code_alsafix as string | undefined),
      element_quantity: supplierElementQuantity(item, item.box_quantity as number | null | undefined),
    }));
  }

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, code_alsafix, box_quantity")
    .in("id", productIds);

  const productById = new Map<string, { code_alsafix?: string | null; box_quantity?: number | null }>();
  for (const product of products || []) {
    productById.set(product.id, product);
  }

  return items.map((item) => {
    const productId = (item.product_id || item.id) as string | undefined;
    const product = productId ? productById.get(productId) : undefined;
    const code = (productId && alsafixCodeOnly(product?.code_alsafix)) ||
      alsafixCodeOnly(item.code_alsafix as string | undefined) ||
      "";
    return {
      ...item,
      code_alsafix: code,
      box_quantity: product?.box_quantity ?? item.box_quantity ?? null,
      element_quantity: supplierElementQuantity(item, product?.box_quantity),
    };
  });
}
