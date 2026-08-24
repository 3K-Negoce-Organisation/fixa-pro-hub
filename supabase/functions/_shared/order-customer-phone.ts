import Stripe from "https://esm.sh/stripe@18.5.0";

type OrderPhoneSource = {
  id?: string;
  user_id?: string | null;
  notes?: string | null;
};

export function parseStripeModeFromNotes(notes?: string | null): "test" | "live" {
  return notes?.includes("stripe_mode:test") ? "test" : "live";
}

export function parsePaymentIntentIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/(?:Payment Intent|Stripe PaymentIntent):\s*(pi_[a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

export function parseCheckoutSessionIdFromNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/(?:Checkout Session|Stripe Checkout Session):\s*(cs_[a-zA-Z0-9]+)/i);
  return match?.[1] ?? null;
}

/** Téléphone stocké dans notes hub marketplace (`tel:+336…`). */
export function parsePhoneFromOrderNotes(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/(?:^|\|\s*)tel:([^\s|]+)/i);
  const phone = match?.[1]?.trim();
  return phone || null;
}

function digPhoneFromUnknown(value: unknown, depth = 0): string | null {
  if (depth > 4 || value == null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length >= 6 ? t : null;
  }
  if (typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  for (const key of ["phone", "phone_number", "mobile", "cellphone", "Phone"]) {
    const found = digPhoneFromUnknown(obj[key], depth + 1);
    if (found) return found;
  }
  for (const nestedKey of ["shipping", "billing", "customer", "addresses"]) {
    const nested = obj[nestedKey];
    if (nested && typeof nested === "object") {
      if (nestedKey === "addresses") {
        const addr = nested as Record<string, unknown>;
        for (const side of ["shipping", "billing"]) {
          const found = digPhoneFromUnknown(addr[side], depth + 1);
          if (found) return found;
        }
      } else {
        const found = digPhoneFromUnknown(nested, depth + 1);
        if (found) return found;
      }
    }
  }
  return null;
}

export function createStripeClientForOrderNotes(notes?: string | null): Stripe | null {
  const testMode = parseStripeModeFromNotes(notes) === "test";
  const apiKey = testMode
    ? (Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "")
    : (Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "");
  if (!apiKey) return null;
  return new Stripe(apiKey, { apiVersion: "2025-08-27.basil" });
}

export async function resolveOrderCustomerPhone(
  supabaseAdmin: {
    from: (table: string) => Record<string, unknown>;
    auth: { admin: { getUserById: (id: string) => Promise<{ data: { user?: Record<string, unknown> | null } | null }> } };
  },
  order: OrderPhoneSource,
): Promise<string | null> {
  const fromNotes = parsePhoneFromOrderNotes(order.notes);
  if (fromNotes) return fromNotes;

  if (order.id) {
    try {
      const channelQuery = await supabaseAdmin
        .from("channel_orders")
        .select("raw_payload")
        .eq("order_id", order.id)
        .maybeSingle() as { data: { raw_payload?: unknown } | null };
      const fromPayload = digPhoneFromUnknown(channelQuery.data?.raw_payload);
      if (fromPayload) return fromPayload;
    } catch {
      // table absente ou pas de lien canal
    }
  }

  if (order.user_id) {
    const profileQuery = await supabaseAdmin
      .from("profiles")
      .select("phone")
      .eq("user_id", order.user_id)
      .maybeSingle() as { data: { phone?: string | null } | null };

    const profilePhone = profileQuery.data?.phone?.trim();
    if (profilePhone) return profilePhone;

    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      const user = userData?.user as Record<string, unknown> | null | undefined;
      const meta = user?.user_metadata as Record<string, unknown> | undefined;
      const authPhone = (user?.phone as string | undefined) || (meta?.phone as string | undefined);
      if (typeof authPhone === "string" && authPhone.trim()) return authPhone.trim();
    } catch {
      // Invité ou utilisateur absent de auth.users
    }
  }

  const stripe = createStripeClientForOrderNotes(order.notes);
  if (!stripe) return null;

  const paymentIntentId = parsePaymentIntentIdFromNotes(order.notes);
  if (paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["latest_charge"],
      });
      const charge = paymentIntent.latest_charge;
      if (charge && typeof charge === "object") {
        const stripePhone = charge.billing_details?.phone?.trim();
        if (stripePhone) return stripePhone;
      }
    } catch {
      // Paiement introuvable ou clé Stripe incorrecte
    }
  }

  const checkoutSessionId = parseCheckoutSessionIdFromNotes(order.notes);
  if (checkoutSessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
      const stripePhone = session.customer_details?.phone?.trim();
      if (stripePhone) return stripePhone;
    } catch {
      // Session introuvable
    }
  }

  return null;
}
