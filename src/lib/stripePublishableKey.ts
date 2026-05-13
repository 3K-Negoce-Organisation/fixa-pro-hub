import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { isDevelopment } from "@/lib/environment";

function trimEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Clé publique pour Stripe.js selon le mode site (aligné sur `sites.stripe_mode`).
 * - test → VITE_STRIPE_PUBLISHABLE_KEY_TEST puis VITE_STRIPE_PUBLISHABLE_KEY
 * - live → VITE_STRIPE_PUBLISHABLE_KEY_LIVE puis VITE_STRIPE_PUBLISHABLE_KEY
 * En développement local uniquement : repli sur VITE_STRIPE_PUBLISHABLE_KEY si les variables spécifiques manquent (aucune clé codée en dur en staging/production).
 */
export function resolvePublishableKey(mode: "live" | "test"): string {
  const generic = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  if (mode === "test") {
    const test = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST);
    if (test) return test;
    if (isDevelopment && generic) return generic;
    return "";
  }
  const live = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE);
  if (live) return live;
  if (isDevelopment && generic) return generic;
  return "";
}

const stripePromiseByKey = new Map<string, Promise<Stripe | null>>();

export function getStripePromiseForPublishableKey(publishableKey: string): Promise<Stripe | null> {
  if (!publishableKey) return Promise.resolve(null);
  if (!stripePromiseByKey.has(publishableKey)) {
    stripePromiseByKey.set(
      publishableKey,
      loadStripe(publishableKey)
        .then((stripe) => {
          if (stripe) console.log("[STRIPE] Stripe.js loaded successfully");
          else console.error("[STRIPE] Stripe.js returned null");
          return stripe;
        })
        .catch((error) => {
          console.error("[STRIPE] Failed to load Stripe.js:", error);
          return null;
        }),
    );
  }
  return stripePromiseByKey.get(publishableKey)!;
}

/** Pour tests ou changement de mode : invalider le cache Stripe.js (ex. après toggle admin). */
export function clearStripePromiseCache(): void {
  stripePromiseByKey.clear();
}
