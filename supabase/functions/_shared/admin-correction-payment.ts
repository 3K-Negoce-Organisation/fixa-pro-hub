import {
  checkoutSessionEventExists,
  insertOrderStatusEvent,
} from "./order-status-events.ts";
import { decomposeOrderTotalTtc, syncOrderItemsToOrderTotal } from "./order-totals.ts";
import { invalidateStoredCustomerInvoice } from "./persist-customer-invoice.ts";
import { roundMoney } from "./money.ts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAdmin = { from: (table: string) => any };

export interface AdminCorrectionStripeContext {
  orderId: string;
  sessionId: string;
  correctionAmountTtc: number;
  paymentIntentId?: string | null;
}

export async function resolveAdminCorrectionFromPaymentIntent(
  stripe: { checkout: { sessions: { list: (p: { payment_intent: string; limit: number }) => Promise<{ data: Array<{ id: string; metadata?: Record<string, string> | null }> }> } } },
  paymentIntentId: string,
  paymentIntentMetadata?: Record<string, string> | null,
): Promise<AdminCorrectionStripeContext | null> {
  const piMeta = paymentIntentMetadata || {};
  if (piMeta.admin_correction === "true" && piMeta.order_id) {
    return {
      orderId: piMeta.order_id,
      sessionId: piMeta.checkout_session_id || "",
      correctionAmountTtc: parseFloat(piMeta.correction_amount_ttc || "0"),
      paymentIntentId,
    };
  }

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 1,
  });
  const session = sessions.data[0];
  const sessionMeta = session?.metadata || {};
  if (sessionMeta.admin_correction === "true" && sessionMeta.order_id && session?.id) {
    return {
      orderId: sessionMeta.order_id,
      sessionId: session.id,
      correctionAmountTtc: parseFloat(sessionMeta.correction_amount_ttc || "0"),
      paymentIntentId,
    };
  }

  return null;
}

async function orderHasRefundEvent(
  supabaseAdmin: SupabaseAdmin,
  orderId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("order_status_events")
    .select("id")
    .eq("order_id", orderId)
    .eq("event_kind", "refund")
    .limit(1)
    .maybeSingle();
  return !!data?.id;
}

/** Après remboursement + lien correctif, le montant payé remplace le total (pas une addition). */
function resolveCorrectionTotals(
  order: Record<string, unknown>,
  correctionAmount: number,
  replaceTotal: boolean,
): { totalTtc: number; totalHt: number | null } {
  const oldTtc = Number(order.total_ttc || 0);
  const oldHt = Number(order.total_ht || 0);

  if (replaceTotal && correctionAmount > 0) {
    const totalTtc = Math.round(correctionAmount * 100) / 100;
    const { productsTTC, shippingTTC } = decomposeOrderTotalTtc(totalTtc);
    const totalHt = roundMoney(productsTTC / 1.2 + shippingTTC / 1.2);
    return { totalTtc, totalHt };
  }

  const totalTtc = Math.round((oldTtc + correctionAmount) * 100) / 100;
  const totalHt = oldTtc > 0 && oldHt > 0
    ? Math.round((totalTtc * oldHt / oldTtc) * 100) / 100
    : null;
  return { totalTtc, totalHt };
}

export async function applyAdminCorrectionPayment(
  supabaseAdmin: SupabaseAdmin,
  ctx: AdminCorrectionStripeContext,
): Promise<{ applied: boolean; skipped?: boolean; orderId: string }> {
  if (ctx.sessionId) {
    const alreadyProcessed = await checkoutSessionEventExists(supabaseAdmin, ctx.sessionId);
    if (alreadyProcessed) {
      return { applied: false, skipped: true, orderId: ctx.orderId };
    }
  }

  const { data: correctionOrder, error: correctionError } = await supabaseAdmin
    .from("orders")
    .select("*")
    .eq("id", ctx.orderId)
    .maybeSingle();

  if (correctionError || !correctionOrder) {
    throw new Error(`Admin correction order not found: ${ctx.orderId}`);
  }

  const correctionAmount = Number.isFinite(ctx.correctionAmountTtc) ? ctx.correctionAmountTtc : 0;
  const hadRefund = await orderHasRefundEvent(supabaseAdmin, ctx.orderId);
  const inManualIntervention = correctionOrder.status === "manual_intervention";
  const replaceTotal = hadRefund
    || correctionOrder.status === "awaiting_payment"
    || inManualIntervention;
  const nextStatus = inManualIntervention
    ? "manual_intervention"
    : correctionOrder.status === "awaiting_payment"
      ? "paid"
      : String(correctionOrder.status || "paid");
  const { totalTtc, totalHt } = resolveCorrectionTotals(
    correctionOrder as Record<string, unknown>,
    correctionAmount,
    replaceTotal,
  );

  const notesParts = [String(correctionOrder.notes || "").trim()];
  if (ctx.sessionId) {
    notesParts.push(`Stripe correction session: ${ctx.sessionId}`);
  }
  if (ctx.paymentIntentId) {
    notesParts.push(`Stripe correction PI: ${ctx.paymentIntentId}`);
  }

  const updatePayload: Record<string, unknown> = {
    status: nextStatus,
    total_ttc: totalTtc,
    notes: notesParts.filter(Boolean).join("\n"),
    updated_at: new Date().toISOString(),
  };
  if (totalHt != null) {
    updatePayload.total_ht = totalHt;
  }
  if (ctx.sessionId) {
    updatePayload.stripe_checkout_session_id = ctx.sessionId;
  }
  if (ctx.paymentIntentId) {
    updatePayload.stripe_payment_intent_id = ctx.paymentIntentId;
  }

  await supabaseAdmin.from("orders").update(updatePayload).eq("id", ctx.orderId);

  if (replaceTotal && correctionAmount > 0) {
    try {
      await syncOrderItemsToOrderTotal(supabaseAdmin, ctx.orderId, totalTtc);
    } catch (syncErr) {
      console.error("[admin-correction] sync order_items failed:", syncErr);
    }
    try {
      await invalidateStoredCustomerInvoice(supabaseAdmin, {
        ...(correctionOrder as Record<string, unknown>),
        ...updatePayload,
        id: ctx.orderId,
      });
    } catch (invErr) {
      console.error("[admin-correction] invalidate customer invoice failed:", invErr);
    }
  }

  await insertOrderStatusEvent(supabaseAdmin, {
    order_id: ctx.orderId,
    status: nextStatus,
    event_kind: "payment_received",
    is_manual: false,
    note: replaceTotal ? "Paiement correctif reçu" : "Paiement complémentaire reçu",
    amount_ttc: correctionAmount > 0 ? correctionAmount : null,
    stripe_checkout_session_id: ctx.sessionId || null,
  });

  return { applied: true, orderId: ctx.orderId };
}
