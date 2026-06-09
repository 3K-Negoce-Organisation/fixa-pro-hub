import {
  parseCheckoutSessionIdFromNotes,
  parsePaymentIntentIdFromNotes,
  parseStripeModeFromNotes,
} from "./order-customer-phone.ts";

type OrderStripeSource = {
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  notes?: string | null;
  site_id?: string | null;
};

export function resolveOrderPaymentIntentId(order: OrderStripeSource): string | null {
  const direct = order.stripe_payment_intent_id?.trim();
  if (direct) return direct;
  return parsePaymentIntentIdFromNotes(order.notes);
}

export function resolveOrderCheckoutSessionId(order: OrderStripeSource): string | null {
  const direct = order.stripe_checkout_session_id?.trim();
  if (direct) return direct;
  return parseCheckoutSessionIdFromNotes(order.notes);
}

export function resolveStripeModeFromOrder(
  order: OrderStripeSource,
  siteStripeMode?: string | null,
): "live" | "test" {
  if (siteStripeMode === "test") return "test";
  if (siteStripeMode === "live") return "live";
  return parseStripeModeFromNotes(order.notes);
}

export function resolveStripeSecretKey(mode: "live" | "test"): string {
  if (mode === "test") {
    return Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  }
  return Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "";
}
