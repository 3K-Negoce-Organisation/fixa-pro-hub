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
      html: `<p>Bonjour,</p><p>Votre commande <strong>${params.orderNumber}</strong> a été annulée. Un remboursement de <strong>${params.amountTtc.toFixed(2).replace(".", ",")} €</strong> a été effectué sur votre moyen de paiement.</p><p>Cordialement,<br/>${params.fromName}</p>`,
    }),
  });
}

async function refundRemainingOnPaymentIntent(
  stripe: Stripe,
  paymentIntentId: string,
): Promise<{ refundId: string; amountTtc: number } | null> {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const charge = typeof pi.latest_charge === "string"
    ? await stripe.charges.retrieve(pi.latest_charge)
    : pi.latest_charge;

  if (!charge || charge.status !== "succeeded") {
    return null;
  }

  const refundableCents = charge.amount - (charge.amount_refunded || 0);
  if (refundableCents <= 0) {
    return null;
  }

  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: refundableCents,
  });

  return {
    refundId: refund.id,
    amountTtc: refundableCents / 100,
  };
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

    const { order_id, note } = await req.json();
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

    if (order.status === "cancelled") {
      return new Response(JSON.stringify({ error: "Cette commande est déjà annulée" }), {
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
    let refundResult: { refundId: string; amountTtc: number } | null = null;

    if (paymentIntentId && order.status !== "pending") {
      const stripeMode = resolveStripeModeFromOrder(order, siteStripeMode);
      const secretKey = resolveStripeSecretKey(stripeMode);
      if (!secretKey) {
        return new Response(JSON.stringify({ error: "Clé Stripe non configurée" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const stripe = new Stripe(secretKey, { apiVersion: "2025-08-27.basil" });
      try {
        refundResult = await refundRemainingOnPaymentIntent(stripe, paymentIntentId);
      } catch (stripeErr) {
        const message = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        return new Response(JSON.stringify({ error: `Remboursement Stripe impossible : ${message}` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const now = new Date().toISOString();
    const cancelNote = `[Admin] Commande annulée — ${note.trim()}`;
    const previousNotes = String(order.notes || "").trim();
    const nextNotes = previousNotes ? `${previousNotes}\n${cancelNote}` : cancelNote;

    const { error: updateError } = await auth.supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        status_before_intervention: null,
        intervention_assigned_to: null,
        intervention_assigned_at: null,
        intervention_assigned_email: null,
        notes: nextNotes,
        updated_at: now,
      })
      .eq("id", order_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (refundResult) {
      await insertOrderStatusEvent(auth.supabaseAdmin, {
        order_id,
        status: "cancelled",
        event_kind: "refund",
        is_manual: true,
        note: `Remboursement à l'annulation — ${note.trim()}`,
        amount_ttc: refundResult.amountTtc,
        stripe_refund_id: refundResult.refundId,
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
            amountTtc: refundResult.amountTtc,
          });
        }
      } catch (emailErr) {
        console.error("[admin-cancel-order] email failed:", emailErr);
      }
    }

    await insertOrderStatusEvent(auth.supabaseAdmin, {
      order_id,
      status: "cancelled",
      event_kind: "manual_status",
      is_manual: true,
      note: note.trim(),
      created_by: auth.userId,
    });

    return new Response(JSON.stringify({
      success: true,
      status: "cancelled",
      refunded: !!refundResult,
      refund_amount_ttc: refundResult?.amountTtc ?? null,
      refund_id: refundResult?.refundId ?? null,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-cancel-order]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
