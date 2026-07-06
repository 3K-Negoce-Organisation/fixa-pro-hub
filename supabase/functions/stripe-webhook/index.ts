import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildOrderItemInsert,
  enrichCartLinesWithProductSnapshots,
  orderItemRowToEnrichmentLine,
} from "../_shared/order-item-snapshot.ts";
import {
  compactItemsToOrderLines,
  parseCompactItemsFromMetadata,
} from "../_shared/stripe-cart-metadata.ts";
import {
  insertOrderStatusEvent,
} from "../_shared/order-status-events.ts";
import {
  applyAdminCorrectionPayment,
  resolveAdminCorrectionFromPaymentIntent,
} from "../_shared/admin-correction-payment.ts";
import { decrementProductsStock } from "../_shared/decrement-product-stock.ts";
import { fulfillPaymentIntentOrder } from "../_shared/payment-intent-order.ts";
import { sendOrderToN8n } from "../_shared/n8n-fulfill-order.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VIS-${year}${month}-${random}`;
}


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Résout `orders.site_id` pour l’admin (filtre par boutique). */
async function resolveOrderSiteId(
  supabaseAdmin: ReturnType<typeof createClient>,
  metadata: Record<string, string | undefined>,
): Promise<string | null> {
  const fromStripe = metadata.site_id?.trim();
  if (fromStripe && UUID_RE.test(fromStripe)) {
    const { data } = await supabaseAdmin.from("sites").select("id").eq("id", fromStripe).maybeSingle();
    if (data?.id) return data.id;
  }
  const slug = (Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois").trim();
  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return site?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const placeholderKey =
      Deno.env.get("STRIPE_SECRET_KEY_LIVE") ||
      Deno.env.get("STRIPE_SECRET_KEY") ||
      "sk_live_placeholder";
    const verifyClient = new Stripe(placeholderKey, { apiVersion: "2025-08-27.basil" });

    const webhookSecrets = [
      Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE"),
      Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST"),
    ].filter((s, i, arr): s is string => Boolean(s) && arr.indexOf(s) === i);

    if (webhookSecrets.length === 0) {
      throw new Error("Aucun STRIPE_WEBHOOK_SECRET_* configuré");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event | null = null;
    let verifyError: unknown = null;
    for (const whSecret of webhookSecrets) {
      try {
        event = await verifyClient.webhooks.constructEventAsync(body, signature, whSecret);
        break;
      } catch (e) {
        verifyError = e;
      }
    }
    if (!event) {
      const message = verifyError instanceof Error ? verifyError.message : "Webhook verification failed";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Webhook signature verified", { eventType: event.type, livemode: event.livemode });

    const stripeApiKey = event.livemode
      ? (Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "")
      : (Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "");
    if (!stripeApiKey) {
      throw new Error(
        event.livemode
          ? "STRIPE_SECRET_KEY_LIVE (ou STRIPE_SECRET_KEY) manquant pour traiter cet événement live"
          : "STRIPE_SECRET_KEY_TEST (ou STRIPE_SECRET_KEY) manquant pour traiter cet événement test",
      );
    }
    const stripe = new Stripe(stripeApiKey, { apiVersion: "2025-08-27.basil" });
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle payment_intent.succeeded (from Stripe Elements PaymentIntent flow)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Processing PaymentIntent succeeded", { paymentIntentId: paymentIntent.id });

      const adminCorrectionCtx = await resolveAdminCorrectionFromPaymentIntent(
        stripe,
        paymentIntent.id,
        paymentIntent.metadata as Record<string, string> | undefined,
      );
      if (adminCorrectionCtx) {
        const result = await applyAdminCorrectionPayment(supabaseAdmin, adminCorrectionCtx);
        logStep("Admin correction applied from PaymentIntent", {
          orderId: result.orderId,
          skipped: result.skipped,
          paymentIntentId: paymentIntent.id,
        });
        return new Response(JSON.stringify({
          received: true,
          admin_correction: true,
          skipped: result.skipped,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const result = await fulfillPaymentIntentOrder(supabaseAdmin, stripe, paymentIntent);
      logStep("PaymentIntent processing complete", result);
    }

    // Handle checkout.session.completed (kept for backwards compatibility)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout session", { sessionId: session.id });

      const sessionMetadata = session.metadata || {};
      if (sessionMetadata.admin_correction === "true" && sessionMetadata.order_id) {
        const correctionAmount = parseFloat(sessionMetadata.correction_amount_ttc || "0");
        const result = await applyAdminCorrectionPayment(supabaseAdmin, {
          orderId: sessionMetadata.order_id,
          sessionId: session.id,
          correctionAmountTtc: correctionAmount,
          paymentIntentId: typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
        });
        logStep("Admin correction payment applied from checkout session", {
          orderId: result.orderId,
          sessionId: session.id,
          skipped: result.skipped,
        });
        return new Response(JSON.stringify({
          received: true,
          admin_correction: true,
          skipped: result.skipped,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Check if order already exists with this Session ID
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, total_ht, total_ttc, user_email, shipping_address, shipping_city, shipping_postal_code, shipping_name")
        .ilike("notes", `%${session.id}%`)
        .maybeSingle();

      if (existingOrder) {
        logStep("Order already exists for this Checkout Session", { 
          orderId: existingOrder.id, 
          orderNumber: existingOrder.order_number 
        });

        // Get order items for n8n webhook
        const { data: existingItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", existingOrder.id);

        // Send webhook to n8n for fulfillment (even if order already exists)
        if (n8nWebhookUrl) {
          const cartItems = (existingItems || []).map((item) =>
            orderItemRowToEnrichmentLine(item as Record<string, unknown>),
          );

          if (cartItems.length > 0) {
            await sendToN8n(
            n8nWebhookUrl,
            supabaseAdmin,
            existingOrder.order_number,
            existingOrder.id,
            session.id,
            existingOrder.shipping_name,
            existingOrder.user_email,
            null, // phone
            existingOrder.shipping_address ? {
              line1: existingOrder.shipping_address,
              city: existingOrder.shipping_city,
              postal_code: existingOrder.shipping_postal_code,
            } : null,
            cartItems,
            existingOrder.total_ht,
            existingOrder.total_ttc
          );
          } else {
            logStep("Skipping n8n for existing checkout order: no items yet", {
              orderNumber: existingOrder.order_number,
            });
          }
        }

        logStep("Checkout session processing complete (existing order)");
        return new Response(JSON.stringify({ received: true, existing_order: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get session details with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer_details'],
      });

      const metadata = fullSession.metadata || {};
      const userId = metadata.user_id;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      logStep("Session metadata", { userId, totalHT, totalTTC });

      const sessionOrderSiteId = await resolveOrderSiteId(supabaseAdmin, metadata as Record<string, string | undefined>);
      logStep("Resolved order site_id (checkout session)", { sessionOrderSiteId });

      // Parse cart items from metadata (compact/chunked, or legacy items_json)
      let cartItems: any[] = [];
      try {
        const compactItems = parseCompactItemsFromMetadata(metadata as Record<string, string | undefined>);
        if (compactItems.length > 0) {
          cartItems = compactItemsToOrderLines(compactItems);
        } else if (metadata.items_json) {
          cartItems = JSON.parse(metadata.items_json);
        }
      } catch (e) {
        logStep("Failed to parse checkout session items", { error: String(e) });
      }

      cartItems = await enrichCartLinesWithProductSnapshots(
        supabaseAdmin,
        cartItems.map((item: Record<string, unknown>) => ({
          id: item.id as string,
          quantity: item.quantity as number,
          priceHT: item.priceHT as number,
          priceTTC: item.priceTTC as number | undefined,
          variantId: (item.variantId as string | undefined) || (item.id as string),
          variantTitle: (item.variantTitle as string | undefined) || "Default",
          title: item.title as string | undefined,
          handle: item.handle as string | undefined,
          image: item.image as string | undefined,
        })),
      );

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Extract shipping address
      const shippingDetails = fullSession.shipping_details;
      const shippingAddress = shippingDetails?.address;

      // Extract customer email
      const customerEmail = fullSession.customer_details?.email || fullSession.customer_email || null;

      // Create order in Supabase
      const stripeModeFromSession = metadata.stripe_mode === "test" ? "test" : "live";
      const sessionInsert: Record<string, unknown> = {
        order_number: orderNumber,
        user_id: userId,
        user_email: customerEmail,
        status: "paid",
        total_ht: totalHT,
        total_ttc: totalTTC,
        shipping_address: shippingAddress
          ? `${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}`
          : null,
        shipping_city: shippingAddress?.city || null,
        shipping_postal_code: shippingAddress?.postal_code || null,
        stripe_checkout_session_id: session.id,
        notes: `Stripe Session: ${session.id} | stripe_mode:${stripeModeFromSession}`,
      };
      if (sessionOrderSiteId) sessionInsert.site_id = sessionOrderSiteId;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert(sessionInsert as any)
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      await insertOrderStatusEvent(supabaseAdmin, {
        order_id: order.id,
        status: "paid",
        event_kind: "auto_stripe",
        is_manual: false,
        note: "Paiement Checkout Stripe reçu",
        amount_ttc: totalTTC,
        stripe_checkout_session_id: session.id,
      });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map((item: Record<string, unknown>) =>
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

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
          const stockResult = await decrementProductsStock(
            supabaseAdmin,
            orderItems.map((item) => ({
              product_id: String(item.product_id),
              quantity: Number(item.quantity),
            })),
            { order_id: order.id, order_number: orderNumber },
          );
          if (stockResult.warnings.length > 0) {
            logStep("Stock decrement warnings", { warnings: stockResult.warnings });
          } else {
            logStep("Stock decremented", { products_updated: stockResult.products_updated });
          }
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        await sendToN8n(
          n8nWebhookUrl,
          supabaseAdmin,
          orderNumber,
          order.id,
          session.id,
          shippingDetails?.name || fullSession.customer_details?.name || null,
          customerEmail,
          fullSession.customer_details?.phone || null,
          shippingAddress ? {
            name: shippingDetails?.name || undefined,
            line1: shippingAddress.line1 || undefined,
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city || undefined,
            postal_code: shippingAddress.postal_code || undefined,
            country: shippingAddress.country || undefined,
          } : null,
          cartItems,
          totalHT,
          totalTTC
        );
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("Checkout session processing complete");
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = typeof charge.payment_intent === "string"
        ? charge.payment_intent
        : charge.payment_intent?.id;

      if (paymentIntentId) {
        const { data: refundedOrder } = await supabaseAdmin
          .from("orders")
          .select("id, status, order_number")
          .or(`stripe_payment_intent_id.eq.${paymentIntentId},notes.ilike.%${paymentIntentId}%`)
          .maybeSingle();

        if (refundedOrder) {
          const refundAmount = charge.amount_refunded ? charge.amount_refunded / 100 : null;
          await insertOrderStatusEvent(supabaseAdmin, {
            order_id: refundedOrder.id,
            status: refundedOrder.status,
            event_kind: "refund",
            is_manual: false,
            note: "Remboursement synchronisé depuis Stripe",
            amount_ttc: refundAmount,
          });
          logStep("Refund event recorded from Stripe webhook", { orderId: refundedOrder.id });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper function to send to n8n and save document (delegates to shared module)
async function sendToN8n(
  n8nWebhookUrl: string,
  supabaseAdmin: ReturnType<typeof createClient>,
  orderNumber: string,
  orderId: string,
  stripeId: string,
  customerName: string | null,
  customerEmail: string | null,
  customerPhone: string | null,
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    name?: string | null;
  } | null,
  cartItems: Array<Record<string, unknown>>,
  totalHT: number,
  totalTTC: number,
) {
  if (!cartItems.length) {
    logStep("Skipping n8n: no order items", { orderNumber });
    return;
  }

  const normalizedShipping = shippingAddress
    ? {
      name: shippingAddress.name || customerName || undefined,
      line1: shippingAddress.line1 || undefined,
      line2: shippingAddress.line2 || undefined,
      city: shippingAddress.city || undefined,
      postal_code: shippingAddress.postal_code || undefined,
    }
    : null;

  try {
    await sendOrderToN8n({
      n8nWebhookUrl,
      supabaseAdmin,
      orderNumber,
      orderId,
      stripeId,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: normalizedShipping,
      cartItems,
      totalHT,
      totalTTC,
    });
    logStep("n8n fulfillment complete", { orderNumber });
  } catch (n8nError) {
    logStep("n8n webhook failed (non-blocking)", { error: String(n8nError) });
  }
}
