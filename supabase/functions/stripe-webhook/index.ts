import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout session", { sessionId: session.id });

      // Get session details with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer_details'],
      });

      const metadata = fullSession.metadata || {};
      const userId = metadata.user_id;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsJson = metadata.items_json;

      logStep("Session metadata", { userId, totalHT, totalTTC });

      // Parse cart items from metadata
      let cartItems: any[] = [];
      try {
        cartItems = JSON.parse(itemsJson || "[]");
      } catch (e) {
        logStep("Failed to parse items_json", { error: String(e) });
      }

      // Create Supabase client with service role
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Extract shipping address
      const shippingDetails = fullSession.shipping_details;
      const shippingAddress = shippingDetails?.address;

      // Create order in Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          status: "confirmed",
          total_ht: totalHT,
          total_ttc: totalTTC,
          shipping_address: shippingAddress 
            ? `${shippingAddress.line1}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}`
            : null,
          shipping_city: shippingAddress?.city || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          notes: `Stripe Session: ${session.id}`,
        })
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          variant_title: item.variantTitle,
          product_image: item.image,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        try {
          const n8nPayload = {
            event: "order.created",
            order_number: orderNumber,
            order_id: order.id,
            stripe_session_id: session.id,
            customer: {
              email: fullSession.customer_details?.email || fullSession.customer_email,
              phone: fullSession.customer_details?.phone || null,
              name: fullSession.customer_details?.name || shippingDetails?.name || null,
              shipping_address: shippingAddress ? {
                line1: shippingAddress.line1,
                line2: shippingAddress.line2,
                city: shippingAddress.city,
                postal_code: shippingAddress.postal_code,
                country: shippingAddress.country,
              } : null,
            },
            items: cartItems.map(item => ({
              product_id: item.id,
              variant_id: item.variantId,
              title: item.title,
              variant_title: item.variantTitle,
              quantity: item.quantity,
              unit_price_ht: item.priceHT,
              unit_price_ttc: item.priceHT * 1.20,
            })),
            totals: {
              ht: totalHT,
              ttc: totalTTC,
              currency: "EUR",
            },
            created_at: new Date().toISOString(),
          };

          logStep("Sending to n8n", { url: n8nWebhookUrl });

          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
          });

          logStep("n8n response", { status: n8nResponse.status });
        } catch (n8nError) {
          logStep("n8n webhook failed (non-blocking)", { error: String(n8nError) });
        }
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("Checkout session processing complete");
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
