import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildOrderItemInsert,
  enrichCartLinesWithProductSnapshots,
  orderItemRowToEnrichmentLine,
} from "./order-item-snapshot.ts";
import {
  compactItemsToOrderLines,
  parseCompactItemsFromMetadata,
} from "./stripe-cart-metadata.ts";
import { insertOrderStatusEvent } from "./order-status-events.ts";
import { sendOrderToN8n } from "./n8n-fulfill-order.ts";
import { decrementProductsStock } from "./decrement-product-stock.ts";

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
      const cartItems = (existingItems || []).map((item) =>
        orderItemRowToEnrichmentLine(item as Record<string, unknown>),
      );

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

  cartItems = await enrichCartLinesWithProductSnapshots(
    supabaseAdmin,
    cartItems.map((item) => ({
      id: item.id as string,
      quantity: item.quantity as number,
      priceHT: item.priceHT as number,
      priceTTC: item.priceTTC as number | undefined,
      variantId: (item.variantId as string | undefined) || (item.id as string),
      variantTitle: (item.variantTitle as string | undefined) || "Default",
    })),
  );

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
    const orderItems = cartItems.map((item) =>
      buildOrderItemInsert(order.id, {
        id: item.id as string,
        quantity: item.quantity as number,
        priceHT: item.priceHT as number,
        priceTTC: item.priceTTC as number | undefined,
        title: item.title as string,
        handle: item.handle as string,
        image: item.image as string,
        variantId: item.variantId as string,
        variantTitle: item.variantTitle as string,
        code_alsafix: item.code_alsafix,
        box_quantity: item.box_quantity,
        product_description: item.product_description,
        designation_fr: item.designation_fr,
        snapshot_purchase_price_ht: item.snapshot_purchase_price_ht,
        snapshot_unite_de_vente: item.snapshot_unite_de_vente,
      }),
    );

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);
    if (!itemsError) {
      const stockResult = await decrementProductsStock(
        supabaseAdmin,
        orderItems.map((item) => ({
          product_id: String(item.product_id),
          quantity: Number(item.quantity),
        })),
        { order_id: order.id, order_number: orderNumber },
      );
      if (stockResult.warnings.length > 0) {
        console.warn("[fulfillPaymentIntentOrder] stock warnings", stockResult.warnings);
      }
    }
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
