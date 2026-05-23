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
    }));
  }

  const { data: products } = await supabaseAdmin
    .from("products")
    .select("id, code_alsafix")
    .in("id", productIds);

  const codeById = new Map<string, string>();
  for (const product of products || []) {
    const code = alsafixCodeOnly(product.code_alsafix);
    if (code) codeById.set(product.id, code);
  }

  return items.map((item) => {
    const productId = (item.product_id || item.id) as string | undefined;
    return {
      ...item,
      code_alsafix: (productId && codeById.get(productId)) ||
        alsafixCodeOnly(item.code_alsafix as string | undefined) ||
        "",
    };
  });
}
