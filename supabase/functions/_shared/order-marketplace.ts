/** Détecte une commande Amazon (paiement / remboursement hors Stripe). */
export function isAmazonOrderNumber(orderNumber: string | null | undefined): boolean {
  const num = String(orderNumber || "").toUpperCase();
  return num.startsWith("AMZ-") || num.startsWith("AMZ");
}

export function isAmazonChannel(channel: string | null | undefined): boolean {
  if (!channel) return false;
  return channel === "amazon_fr" || channel.startsWith("amazon");
}

export async function resolveOrderIsAmazon(
  // deno-lint-ignore no-explicit-any
  supabaseAdmin: any,
  order: { id: string; order_number?: string | null },
): Promise<boolean> {
  if (isAmazonOrderNumber(order.order_number)) return true;

  const { data } = await supabaseAdmin
    .from("channel_orders")
    .select("channel")
    .eq("order_id", order.id)
    .maybeSingle();

  return isAmazonChannel(data?.channel);
}
