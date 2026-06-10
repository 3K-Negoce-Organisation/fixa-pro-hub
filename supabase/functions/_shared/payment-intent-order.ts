import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { alsafixCodeOnly } from "./alsafix-code.ts";
import { roundMoney } from "./money.ts";
import {
  compactItemsToOrderLines,
  parseCompactItemsFromMetadata,
} from "./stripe-cart-metadata.ts";
import { insertOrderStatusEvent } from "./order-status-events.ts";
import { sendOrderToN8n } from "./n8n-fulfill-order.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ShippingOverride = {
  shipping_name?: string | null;
  shipping_address?: string | null;
  shipping_city?: string | null;
  shipping_postal_code?: string | null;
  phone?: string | null;
  user_email?: string | null;
};

export function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VIS-${year}${month}-${random}`;
}

async function fetchProductDetails(
  supabaseAdmin: SupabaseClient,
  productIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const productMap = new Map<string, Record<string, unknown>>();
  if (productIds.length === 0) return productMap;

  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("id, title, handle, images, code_alsafix, box_quantity")
    .in("id", productIds);

  if (error) return productMap;
  for (const product of products || []) {
    productMap.set(product.id as string, product as Record<string, unknown>);
  }
  return productMap;
}

export async function resolveOrderSiteId(
  supabaseAdmin: SupabaseClient,
  metadata: Record<string, string | undefined>,
): Promise<string | null> {
  const fromStripe = metadata.site_id?.trim();
  if (fromStripe && UUID_RE.test(fromStripe)) {
    const { data } = await supabaseAdmin.from("sites").select("id").eq("id", fromStripe).maybeSingle();
    if (data?.id) return data.id as string;
  }
  const slug = (Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois").trim();
  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return (site?.id as string | undefined) ?? null;
}

export async function findOrderByPaymentIntentId(
  supabaseAdmin: SupabaseClient,
  paymentIntentId: string,
) {
  const { data: byColumn } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, total_ht, total_ttc, user_email, shipping_address, shipping_city, shipping_postal_code, shipping_name")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (byColumn) return byColumn;

  const { data: byNotes } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, total_ht, total_ttc, user_email, shipping_address, shipping_city, shipping_postal_code, shipping_name")
    .ilike("notes", `%${paymentIntentId}%`)
    .maybeSingle();
  return byNotes;
}

export async function fulfillPaymentIntentOrder(
  supabaseAdmin: SupabaseClient,
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
  shippingOverride?: ShippingOverride,
): Promise<{ order_number: string; order_id: string; existing: boolean }> {
  const paymentIntentId = paymentIntent.id;
  const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

  const existingOrder = await findOrderByPaymentIntentId(supabaseAdmin, paymentIntentId);
  if (existingOrder) {
    const { data: existingItems } = await supabaseAdmin
      .from("order_items")
      .select("*")
      .eq("order_id", existingOrder.id);

    if (n8nWebhookUrl) {
      const cartItems = (existingItems || []).map((item) => ({
        id: item.product_id,
        title: item.product_title,
        variantTitle: item.variant_title,
        image: item.product_image,
        quantity: item.quantity,
        priceHT: item.unit_price_ht,
        priceTTC: item.unit_price_ttc,
      }));

      await sendOrderToN8n({
        n8nWebhookUrl,
        supabaseAdmin,
        orderNumber: existingOrder.order_number,
        orderId: existingOrder.id,
        stripeId: paymentIntentId,
        customerName: existingOrder.shipping_name,
        customerEmail: existingOrder.user_email,
        customerPhone: shippingOverride?.phone ?? null,
        shippingAddress: existingOrder.shipping_address
          ? {
            line1: existingOrder.shipping_address,
            city: existingOrder.shipping_city,
            postal_code: existingOrder.shipping_postal_code,
          }
          : null,
        cartItems,
        totalHT: Number(existingOrder.total_ht),
        totalTTC: Number(existingOrder.total_ttc),
      });
    }

    return {
      order_number: existingOrder.order_number,
      order_id: existingOrder.id,
      existing: true,
    };
  }

  if (paymentIntent.status !== "succeeded") {
    throw new Error(`PaymentIntent ${paymentIntentId} n'est pas en statut succeeded`);
  }

  const metadata = paymentIntent.metadata || {};
  const metaUserId = metadata.user_id;
  const userId = metaUserId && metaUserId !== "guest" && UUID_RE.test(metaUserId) ? metaUserId : null;
  const userEmail = (shippingOverride?.user_email || metadata.user_email || "").trim() || null;
  const totalHT = parseFloat(metadata.total_ht || "0");
  const totalTTC = parseFloat(metadata.total_ttc || "0");
  const orderSiteId = await resolveOrderSiteId(supabaseAdmin, metadata);

  let cartItems: Array<Record<string, unknown>> = [];
  try {
    const compactItems = parseCompactItemsFromMetadata(metadata);
    cartItems = compactItemsToOrderLines(compactItems);
  } catch {
    cartItems = [];
  }

  const productMap = await fetchProductDetails(supabaseAdmin, cartItems.map((item) => item.id as string));
  cartItems = cartItems.map((item) => {
    const product = productMap.get(item.id as string);
    const images = product?.images as Array<{ url?: string }> | undefined;
    return {
      ...item,
      title: product?.title || `Product ${item.id}`,
      handle: product?.handle || "",
      image: images?.[0]?.url || "",
      code_alsafix: alsafixCodeOnly(product?.code_alsafix as string | null | undefined),
      box_quantity: product?.box_quantity ?? null,
      variantTitle: "Default",
    };
  });

  let customerName = shippingOverride?.shipping_name ?? null;
  let shippingLine1 = shippingOverride?.shipping_address ?? null;
  let shippingCity = shippingOverride?.shipping_city ?? null;
  let shippingPostalCode = shippingOverride?.shipping_postal_code ?? null;
  let customerPhone = shippingOverride?.phone ?? null;

  if (paymentIntent.latest_charge && (!shippingLine1 || !customerPhone)) {
    try {
      const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
      if (charge.shipping?.address && !shippingLine1) {
        const addr = charge.shipping.address;
        shippingLine1 = `${addr.line1 || ""}${addr.line2 ? `, ${addr.line2}` : ""}`.trim() || null;
        shippingCity = shippingCity || addr.city || null;
        shippingPostalCode = shippingPostalCode || addr.postal_code || null;
        customerName = customerName || charge.shipping.name || null;
      }
      customerPhone = customerPhone || charge.billing_details?.phone || null;
    } catch {
      // ignore charge lookup errors
    }
  }

  const orderNumber = generateOrderNumber();
  const stripeModeFromMetadata = metadata.stripe_mode === "test" ? "test" : "live";
  const insertPayload: Record<string, unknown> = {
    order_number: orderNumber,
    user_id: userId,
    user_email: userEmail,
    status: "paid",
    total_ht: totalHT,
    total_ttc: totalTTC,
    shipping_address: shippingLine1,
    shipping_city: shippingCity,
    shipping_postal_code: shippingPostalCode,
    shipping_name: customerName,
    stripe_payment_intent_id: paymentIntentId,
    notes: `Stripe PaymentIntent: ${paymentIntentId} | stripe_mode:${stripeModeFromMetadata}`,
  };
  if (orderSiteId) insertPayload.site_id = orderSiteId;

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .insert(insertPayload)
    .select()
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message || "Échec création commande");
  }

  await insertOrderStatusEvent(supabaseAdmin, {
    order_id: order.id,
    status: "paid",
    event_kind: "auto_stripe",
    is_manual: false,
    note: "Paiement Stripe reçu",
    amount_ttc: totalTTC,
  });

  if (cartItems.length > 0) {
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_title: item.title,
      variant_title: item.variantTitle || "Default",
      product_image: item.image || null,
      quantity: item.quantity,
      unit_price_ht: roundMoney(Number(item.priceHT)),
      unit_price_ttc: roundMoney(Number(item.priceTTC ?? Number(item.priceHT) * 1.2)),
    }));

    await supabaseAdmin.from("order_items").insert(orderItems);
  }

  if (n8nWebhookUrl) {
    await sendOrderToN8n({
      n8nWebhookUrl,
      supabaseAdmin,
      orderNumber,
      orderId: order.id,
      stripeId: paymentIntentId,
      customerName,
      customerEmail: userEmail,
      customerPhone,
      shippingAddress: shippingLine1
        ? { line1: shippingLine1, city: shippingCity, postal_code: shippingPostalCode }
        : null,
      cartItems,
      totalHT,
      totalTTC,
    });
  }

  return { order_number: orderNumber, order_id: order.id, existing: false };
}

export function stripeClientForPaymentIntent(paymentIntent: Stripe.PaymentIntent): Stripe {
  const stripeApiKey = paymentIntent.livemode
    ? (Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "")
    : (Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "");
  if (!stripeApiKey) {
    throw new Error("Clé Stripe secrète manquante pour ce mode de paiement");
  }
  return new Stripe(stripeApiKey, { apiVersion: "2025-08-27.basil" });
}
