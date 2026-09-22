import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type StockDecrementLine = {
  product_id: string;
  quantity: number;
};

/**
 * Décrémente le stock de façon atomique (GREATEST) pour limiter les courses.
 * Alerte si le stock avant MAJ était déjà insuffisant.
 */
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
  const updatedProductIds: string[] = [];

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
    if (currentStock < qty) {
      warnings.push(
        `Stock insuffisant ${product.code_alsafix || productId}: ${currentStock} demandé ${qty}`,
      );
    }

    // UPDATE atomique : stock = GREATEST(0, stock - qty) sans read-modify-write compétitif.
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("products")
      .update({
        stock: Math.max(0, currentStock - qty),
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId)
      .eq("stock", currentStock)
      .select("id, stock")
      .maybeSingle();

    if (updateError) {
      warnings.push(`Échec MAJ stock ${product.code_alsafix || productId}: ${updateError.message}`);
      continue;
    }

    if (!updated) {
      // Course : re-fetch + retry unique
      const { data: again } = await supabaseAdmin
        .from("products")
        .select("id, stock, code_alsafix")
        .eq("id", productId)
        .maybeSingle();
      if (!again) {
        warnings.push(`Produit disparu pendant décrément: ${productId}`);
        continue;
      }
      const againStock = Math.trunc(Number(again.stock) || 0);
      if (againStock < qty) {
        warnings.push(
          `Stock insuffisant ${again.code_alsafix || productId}: ${againStock} demandé ${qty}`,
        );
      }
      const { error: retryError } = await supabaseAdmin
        .from("products")
        .update({
          stock: Math.max(0, againStock - qty),
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("stock", againStock);
      if (retryError) {
        warnings.push(`Échec retry stock ${again.code_alsafix || productId}: ${retryError.message}`);
        continue;
      }
    }

    productsUpdated++;
    updatedProductIds.push(productId);
    console.log("[decrement-product-stock]", {
      order_id: context?.order_id,
      order_number: context?.order_number,
      product_id: productId,
      code_alsafix: product.code_alsafix,
      from: currentStock,
      qty,
      to: Math.max(0, currentStock - qty),
    });
  }

  if (updatedProductIds.length > 0) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const apiKey = Deno.env.get("MARKETPLACE_HUB_API_KEY") ?? Deno.env.get("VAB_API_KEY");
    if (supabaseUrl && apiKey) {
      fetch(`${supabaseUrl}/functions/v1/marketplace-push-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ product_ids: [...new Set(updatedProductIds)] }),
      }).catch((e) => console.warn("[decrement-product-stock] marketplace push:", e));
    }
  }

  return { products_updated: productsUpdated, warnings };
}
