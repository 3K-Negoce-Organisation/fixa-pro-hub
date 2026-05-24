import Stripe from "https://esm.sh/stripe@18.5.0";

const FRENCH_LOCALES: Stripe.CustomerCreateParams["preferred_locales"] = ["fr"];

/** Client Stripe avec reçus / emails Stripe en français. */
export async function ensureFrenchStripeCustomer(
  stripe: Stripe,
  email: string,
  options: { userId?: string; isGuest?: boolean },
): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  const customers = await stripe.customers.list({ email: normalizedEmail, limit: 1 });

  if (customers.data.length > 0) {
    const existing = customers.data[0];
    const hasFrench = existing.preferred_locales?.includes("fr");
    if (!hasFrench) {
      await stripe.customers.update(existing.id, { preferred_locales: FRENCH_LOCALES });
    }
    return existing.id;
  }

  const customer = await stripe.customers.create({
    email: normalizedEmail,
    preferred_locales: FRENCH_LOCALES,
    metadata: options.userId
      ? { user_id: options.userId }
      : options.isGuest
        ? { guest: "true" }
        : {},
  });
  return customer.id;
}
