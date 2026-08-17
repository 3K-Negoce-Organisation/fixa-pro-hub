import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alsafixCodeOnly } from "./alsafix-code.ts";
import { roundMoney } from "./money.ts";

export type ProductSnapshotRow = {
  id: string;
  title: string;
  handle?: string | null;
  description?: string | null;
  designation_fr?: string | null;
  images?: Array<{ url?: string }> | null;
  code_alsafix?: string | null;
  box_quantity?: number | null;
  purchase_price_ht?: number | null;
  unite_de_vente?: number | null;
};

export const PRODUCT_SNAPSHOT_SELECT =
  "id, title, handle, description, designation_fr, images, code_alsafix, box_quantity, purchase_price_ht, unite_de_vente";

export type CartLineForSnapshot = {
  id: string;
  quantity: number;
  priceHT: number;
  priceTTC?: number;
  title?: string;
  handle?: string;
  image?: string;
  variantId?: string;
  variantTitle?: string;
};

export async function fetchProductsForOrderSnapshot(
  supabaseAdmin: SupabaseClient,
  productIds: string[],
): Promise<Map<string, ProductSnapshotRow>> {
  const productMap = new Map<string, ProductSnapshotRow>();
  if (productIds.length === 0) return productMap;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select(PRODUCT_SNAPSHOT_SELECT)
    .in("id", productIds);

  if (error) return productMap;
  for (const product of products || []) {
    productMap.set(product.id as string, product as ProductSnapshotRow);
  }
  return productMap;
}

export function enrichCartLineWithProductSnapshot(
  line: CartLineForSnapshot,
  product?: ProductSnapshotRow | null,
): CartLineForSnapshot & Record<string, unknown> {
  const images = product?.images;
  return {
    ...line,
    title: line.title || product?.title || `Product ${line.id}`,
    handle: line.handle || product?.handle || "",
    image: line.image || images?.[0]?.url || "",
    variantId: line.variantId || line.id,
    variantTitle: line.variantTitle || "Default",
    code_alsafix: alsafixCodeOnly(product?.code_alsafix),
    box_quantity: product?.box_quantity ?? null,
    product_description: product?.description ?? null,
    designation_fr: product?.designation_fr ?? null,
    snapshot_purchase_price_ht: product?.purchase_price_ht ?? null,
    snapshot_unite_de_vente: product?.unite_de_vente ?? null,
  };
}

export function buildOrderItemInsert(
  orderId: string,
  line: CartLineForSnapshot & Record<string, unknown>,
) {
  const priceHT = roundMoney(Number(line.priceHT));
  const priceTTC = roundMoney(Number(line.priceTTC ?? priceHT * 1.2));

  return {
    order_id: orderId,
    product_id: line.id,
    product_title: line.title as string,
    variant_title: (line.variantTitle as string) || "Default",
    variant_id: (line.variantId as string) || line.id,
    product_image: (line.image as string) || null,
    product_handle: (line.handle as string) || null,
    product_description: (line.product_description as string | null) ?? null,
    designation_fr: (line.designation_fr as string | null) ?? null,
    code_alsafix: (line.code_alsafix as string) || null,
    box_quantity: (line.box_quantity as number | null) ?? null,
    snapshot_purchase_price_ht: (line.snapshot_purchase_price_ht as number | null) ?? null,
    snapshot_unite_de_vente: (line.snapshot_unite_de_vente as number | null) ?? null,
    quantity: line.quantity,
    unit_price_ht: priceHT,
    unit_price_ttc: priceTTC,
  };
}

export async function enrichCartLinesWithProductSnapshots(
  supabaseAdmin: SupabaseClient,
  lines: CartLineForSnapshot[],
): Promise<Array<CartLineForSnapshot & Record<string, unknown>>> {
  const productMap = await fetchProductsForOrderSnapshot(
    supabaseAdmin,
    lines.map((line) => line.id),
  );
  return lines.map((line) =>
    enrichCartLineWithProductSnapshot(line, productMap.get(line.id)),
  );
}

/** Mappe une ligne order_items DB vers le format attendu par enrichItemsWithAlsafixCodes / PDF. */
export function orderItemRowToEnrichmentLine(item: Record<string, unknown>): Record<string, unknown> {
  return {
    ...item,
    id: item.product_id,
    title: item.product_title,
    variantId: item.variant_id ?? item.product_id,
    variant_id: item.variant_id ?? item.product_id,
    image: item.product_image,
    priceHT: item.unit_price_ht,
    priceTTC: item.unit_price_ttc,
    purchase_price_ht: item.snapshot_purchase_price_ht,
    product_purchase_price_ht: item.snapshot_purchase_price_ht,
    unite_de_vente: item.snapshot_unite_de_vente,
    product_unite_de_vente: item.snapshot_unite_de_vente,
  };
}

/**
 * Snapshot « figé » utilisable pour le BC fournisseur : il faut un prix d’achat.
 * Un simple code_alsafix (ex. import ManoMano sans snapshot) ne suffit pas —
 * sinon le PDF part à 0 € sans relecture catalogue.
 */
export function orderItemHasFrozenSnapshot(item: Record<string, unknown>): boolean {
  const purchase = Number(
    item.snapshot_purchase_price_ht ?? item.product_purchase_price_ht ?? item.purchase_price_ht ?? NaN,
  );
  return Number.isFinite(purchase) && purchase > 0;
}
