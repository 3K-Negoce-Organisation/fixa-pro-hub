import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { splitOrderTotals } from "./order-totals.ts";
import { sendOrderConfirmationEmail, type OrderConfirmationEmailParams } from "./send-order-confirmation-email.ts";
import { buildGuestOrderTrackingUrl } from "./guest-order-tracking-url.ts";
import { resolveResendFrom } from "./resolve-resend-from.ts";

type OrderRow = {
  order_number: string;
  user_email: string | null;
  shipping_name: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  total_ht: number;
  total_ttc: number;
  user_id: string | null;
};

type OrderItemRow = {
  product_title: string;
  variant_title: string | null;
  quantity: number;
  unit_price_ht: number;
  box_quantity?: number | null;
};

export async function sendOrderConfirmationForOrderId(
  supabaseAdmin: SupabaseClient,
  orderId: string,
): Promise<{ sent: boolean; order_number?: string; error?: string }> {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, user_email, shipping_name, shipping_address, shipping_city, shipping_postal_code, total_ht, total_ttc, user_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    return { sent: false, error: orderError?.message || "Commande introuvable" };
  }

  return sendOrderConfirmationForOrderRow(supabaseAdmin, order as OrderRow, orderId);
}

export async function sendOrderConfirmationForOrderNumber(
  supabaseAdmin: SupabaseClient,
  orderNumber: string,
): Promise<{ sent: boolean; order_number?: string; error?: string }> {
  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, user_email, shipping_name, shipping_address, shipping_city, shipping_postal_code, total_ht, total_ttc, user_id")
    .eq("order_number", orderNumber.trim().toUpperCase())
    .maybeSingle();

  if (orderError || !order) {
    return { sent: false, error: orderError?.message || "Commande introuvable" };
  }

  return sendOrderConfirmationForOrderRow(supabaseAdmin, order as OrderRow, order.id as string);
}

async function sendOrderConfirmationForOrderRow(
  supabaseAdmin: SupabaseClient,
  order: OrderRow,
  orderId: string,
): Promise<{ sent: boolean; order_number?: string; error?: string }> {
  const customerEmail = (order.user_email || "").trim();
  if (!customerEmail) {
    return { sent: false, order_number: order.order_number, error: "Pas d'email client sur la commande" };
  }

  const { data: supplierSettings } = await supabaseAdmin
    .from("supplier_settings")
    .select("*")
    .maybeSingle();

  const fromEmail = supplierSettings?.customer_service_email || supplierSettings?.email;
  if (!fromEmail && !Deno.env.get("RESEND_FROM_EMAIL")) {
    return { sent: false, order_number: order.order_number, error: "Email expéditeur non configuré" };
  }

  const { fromEmail: resendFrom, fromName, replyTo } = resolveResendFrom(supplierSettings);

  const { data: items, error: itemsError } = await supabaseAdmin
    .from("order_items")
    .select("product_title, variant_title, quantity, unit_price_ht, product_id")
    .eq("order_id", orderId);

  if (itemsError) {
    return { sent: false, order_number: order.order_number, error: itemsError.message };
  }

  const productIds = (items || []).map((i) => i.product_id as string).filter(Boolean);
  let boxByProduct = new Map<string, number | null>();
  if (productIds.length > 0) {
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, box_quantity")
      .in("id", productIds);
    for (const p of products || []) {
      boxByProduct.set(p.id as string, (p.box_quantity as number | null) ?? null);
    }
  }

  const mappedItems = (items || []).map((item) => ({
    title: item.product_title as string,
    variantTitle: item.variant_title as string | null,
    quantity: item.quantity as number,
    unit_price_ht: Number(item.unit_price_ht),
    boxQuantity: boxByProduct.get(item.product_id as string) ?? null,
  }));

  const { productsHT, shippingHT } = splitOrderTotals(
    mappedItems.map((item) => ({
      priceHT: item.unit_price_ht,
      quantity: item.quantity,
    })),
    Number(order.total_ht),
  );

  const shippingCityLine = order.shipping_postal_code && order.shipping_city
    ? `${order.shipping_postal_code} ${order.shipping_city}`
    : order.shipping_city;

  const trackingUrl = !order.user_id
    ? buildGuestOrderTrackingUrl(order.order_number, customerEmail)
    : `${(Deno.env.get("STOREFRONT_URL") || "https://www.vis-a-bois.com").replace(/\/$/, "")}/suivi?order=${encodeURIComponent(order.order_number)}`;

  const params: OrderConfirmationEmailParams = {
    customerEmail,
    fromEmail: resendFrom,
    fromName,
    replyTo,
    bccEmail: null,
    orderNumber: order.order_number,
    items: mappedItems,
    productsHT,
    shippingHT,
    totalHT: Number(order.total_ht),
    totalTTC: Number(order.total_ttc),
    shippingName: order.shipping_name,
    shippingAddress: order.shipping_address,
    shippingCityLine,
    trackingUrl,
  };

  const sendResult = await sendOrderConfirmationEmail(params);
  return {
    sent: sendResult.sent,
    order_number: order.order_number,
    error: sendResult.sent ? undefined : (sendResult.error || "Échec envoi Resend"),
  };
}
