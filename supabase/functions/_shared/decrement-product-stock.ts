import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StockDecrementLine = {
  product_id: string;
  quantity: number;
};

export async function decrementProductsStock(
  supabaseAdmin: SupabaseClient,
  lines: StockDecrementLine[],
  context?: { order_id?: string; order_number?: string },
): Promise<{ products_updated: number; warnings: string[] }> {
  const totals = new Map<string, number>();

  for (const line of lines) {
    const productId = String(line.product_id || "").trim();
    const qty = Math.trunc(Number(line.quantity) || 0);
    if (!productId || !UUID_RE.test(productId) || qty <= 0) continue;
    totals.set(productId, (totals.get(productId) || 0) + qty);
  }

  const warnings: string[] = [];
  let productsUpdated = 0;

  for (const [productId, qty] of totals) {
    const { data: product, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("id, stock, code_alsafix")
      .eq("id", productId)
      .maybeSingle();

    if (fetchError || !product) {
      warnings.push(`Produit introuvable pour décrément stock: ${productId}`);
      continue;
    }

    const currentStock = Math.trunc(Number(product.stock) || 0);
    const nextStock = Math.max(0, currentStock - qty);

    if (nextStock < currentStock - qty) {
      warnings.push(
        `Stock insuffisant ${product.code_alsafix || productId}: ${currentStock} demandé ${qty}`,
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("products")
      .update({ stock: nextStock, updated_at: new Date().toISOString() })
      .eq("id", productId);

    if (updateError) {
      warnings.push(`Échec MAJ stock ${product.code_alsafix || productId}: ${updateError.message}`);
      continue;
    }

    productsUpdated++;
    console.log("[decrement-product-stock]", {
      order_id: context?.order_id,
      order_number: context?.order_number,
      product_id: productId,
      code_alsafix: product.code_alsafix,
      from: currentStock,
      qty,
      to: nextStock,
    });
  }

  return { products_updated: productsUpdated, warnings };
}
