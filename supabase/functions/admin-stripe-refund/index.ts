import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";
import { insertOrderStatusEvent } from "../_shared/order-status-events.ts";
import {
  resolveOrderPaymentIntentId,
  resolveStripeModeFromOrder,
  resolveStripeSecretKey,
} from "../_shared/order-stripe-resolve.ts";
import { resolveOrderCustomerEmail } from "../_shared/order-customer-email.ts";
import { resolveOrderIsAmazon } from "../_shared/order-marketplace.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

async function sendRefundEmail(params: {
  customerEmail: string;
  fromEmail: string;
  fromName: string;
  bccEmail?: string | null;
  orderNumber: string;
  amountTtc: number;
}): Promise<void> {
  if (!RESEND_API_KEY) return;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${params.fromName} <${params.fromEmail}>`,
      to: [{ email: params.customerEmail }],
      bcc: params.bccEmail ? [{ email: params.bccEmail }] : undefined,
      subject: `Remboursement — commande ${params.orderNumber}`,
      html: `<p>Bonjour,</p><p>Un remboursement de <strong>${params.amountTtc.toFixed(2).replace(".", ",")} €</strong> a été effectué pour votre commande <strong>${params.orderNumber}</strong>.</p><p>Cordialement,<br/>${params.fromName}</p>`,
    }),
  });
}

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
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id requis" }), {
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

    if (await resolveOrderIsAmazon(auth.supabaseAdmin, order)) {
      return new Response(JSON.stringify({
        error: "Commande Amazon : le remboursement doit être fait via Seller Central, pas Stripe",
      }), {
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

    const paymentIntentId = resolveOrderPaymentIntentId(order);
    if (!paymentIntentId) {
      return new Response(JSON.stringify({ error: "Aucun PaymentIntent Stripe trouvé pour cette commande" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    const refundParams: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    let refundAmountTtc = amount_ttc != null ? Number(amount_ttc) : Number(order.total_ttc || 0);
    if (amount_ttc != null && Number(amount_ttc) > 0) {
      refundParams.amount = Math.round(Number(amount_ttc) * 100);
      refundAmountTtc = Number(amount_ttc);
    }

    const refund = await stripe.refunds.create(refundParams);

    await insertOrderStatusEvent(auth.supabaseAdmin, {
      order_id,
      status: order.status,
      event_kind: "refund",
      is_manual: true,
      note: note.trim(),
      amount_ttc: refundAmountTtc,
      stripe_refund_id: refund.id,
      created_by: auth.userId,
    });

    try {
      const customerEmail = await resolveOrderCustomerEmail(auth.supabaseAdmin, order, order.user_email);
      const { data: supplierSettings } = await auth.supabaseAdmin
        .from("supplier_settings")
        .select("customer_service_email, status_email, name")
        .eq("site_id", order.site_id)
        .maybeSingle();

      if (customerEmail && supplierSettings?.customer_service_email) {
        await sendRefundEmail({
          customerEmail,
          fromEmail: supplierSettings.customer_service_email,
          fromName: supplierSettings.name || "Vis-à-Bois",
          bccEmail: supplierSettings.status_email,
          orderNumber: order.order_number,
          amountTtc: refundAmountTtc,
        });
      }
    } catch (emailErr) {
      console.error("[admin-stripe-refund] email failed:", emailErr);
    }

    return new Response(JSON.stringify({
      success: true,
      refund_id: refund.id,
      amount_ttc: refundAmountTtc,
      status_unchanged: order.status,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-stripe-refund]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
