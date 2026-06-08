import {
  createStripeClientForOrderNotes,
  parseCheckoutSessionIdFromNotes,
} from "./order-customer-phone.ts";

export type OrderEmailSource = {
  user_id?: string | null;
  user_email?: string | null;
  notes?: string | null;
};

export async function resolveOrderCustomerEmail(
  supabaseAdmin: {
    from: (table: string) => Record<string, unknown>;
    auth: { admin: { getUserById: (id: string) => Promise<{ data: { user?: { email?: string | null } | null } | null }> } };
  },
  order: OrderEmailSource,
  fallback?: string | null,
): Promise<string> {
  const direct = fallback?.trim() || order.user_email?.trim();
  if (direct && direct.includes("@")) return direct;

  if (order.user_id) {
    try {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      const authEmail = userData?.user?.email?.trim();
      if (authEmail && authEmail.includes("@")) return authEmail;
    } catch {
      // Invité ou utilisateur absent de auth.users
    }
  }

  const stripe = createStripeClientForOrderNotes(order.notes);
  if (stripe) {
    const checkoutSessionId = parseCheckoutSessionIdFromNotes(order.notes);
    if (checkoutSessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
        const stripeEmail = session.customer_details?.email?.trim()
          || (typeof session.customer_email === "string" ? session.customer_email.trim() : "");
        if (stripeEmail && stripeEmail.includes("@")) return stripeEmail;
      } catch {
        // Session introuvable
      }
    }
  }

  return direct && direct.includes("@") ? direct : "";
}
