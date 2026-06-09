import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";
import { insertOrderStatusEvent } from "../_shared/order-status-events.ts";
import {
  resolveStripeModeFromOrder,
  resolveStripeSecretKey,
} from "../_shared/order-stripe-resolve.ts";
import { resolveOrderCustomerEmail } from "../_shared/order-customer-email.ts";
import { sendPaymentCorrectionEmail } from "../_shared/send-payment-correction-email.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_id, amount_ttc, note } = await req.json();
    const amount = Number(amount_ttc);

    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "amount_ttc doit être > 0" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!note?.trim()) {
      return new Response(JSON.stringify({ error: "note (motif) requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderError } = await auth.supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Commande non trouvée" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerEmail = await resolveOrderCustomerEmail(auth.supabaseAdmin, order, order.user_email);
    if (!customerEmail) {
      return new Response(JSON.stringify({ error: "Email client introuvable" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let siteStripeMode: string | null = null;
    if (order.site_id) {
      const { data: site } = await auth.supabaseAdmin
        .from("sites")
        .select("stripe_mode")
        .eq("id", order.site_id)
        .maybeSingle();
      siteStripeMode = site?.stripe_mode ?? null;
    }

    const stripeMode = resolveStripeModeFromOrder(order, siteStripeMode);
    const secretKey = resolveStripeSecretKey(stripeMode);
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Clé Stripe non configurée" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
    const origin = Deno.env.get("STOREFRONT_URL") || "https://vis-a-bois.fr";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customerEmail,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(amount * 100),
          product_data: {
            name: `Complément commande ${order.order_number}`,
            description: note.trim().slice(0, 200),
          },
        },
      }],
      success_url: `${origin}/commande/${order.order_number}?payment=success`,
      cancel_url: `${origin}/commande/${order.order_number}?payment=cancelled`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        admin_correction: "true",
        site_id: order.site_id || "",
        stripe_mode: stripeMode,
        correction_amount_ttc: String(amount),
      },
    });

    if (!session.url) {
      return new Response(JSON.stringify({ error: "Stripe n'a pas renvoyé d'URL de paiement" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await auth.supabaseAdmin
      .from("orders")
      .update({
        status: "awaiting_payment",
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await insertOrderStatusEvent(auth.supabaseAdmin, {
      order_id,
      status: "awaiting_payment",
      event_kind: "payment_link_sent",
      is_manual: true,
      note: note.trim(),
      amount_ttc: amount,
      stripe_checkout_session_id: session.id,
      created_by: auth.userId,
    });

    const { data: supplierSettings } = await auth.supabaseAdmin
      .from("supplier_settings")
      .select("customer_service_email, status_email, name")
      .eq("site_id", order.site_id)
      .maybeSingle();

    const fromEmail = supplierSettings?.customer_service_email;
    if (fromEmail) {
      await sendPaymentCorrectionEmail({
        customerEmail,
        fromEmail,
        fromName: supplierSettings?.name || "Vis-à-Bois",
        bccEmail: supplierSettings?.status_email,
        orderNumber: order.order_number,
        amountTtc: amount,
        paymentUrl: session.url,
        note: note.trim(),
      });
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
      status: "awaiting_payment",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-create-payment-link]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
