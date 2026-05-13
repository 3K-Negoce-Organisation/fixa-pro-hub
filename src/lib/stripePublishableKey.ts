import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { isDevelopment } from "@/lib/environment";

function trimEnv(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Repli sur `VITE_STRIPE_PUBLISHABLE_KEY` uniquement en **développement local**.
 * Sur **staging / production**, ne pas réutiliser une seule clé pour les deux modes : sinon le passage en « live »
 * charge encore un `pk_test` et le switch semble inopérant.
 */
const allowGenericPublishableKeyFallback = isDevelopment;

function enforcePublishablePrefix(mode: "live" | "test", key: string): string {
  if (!key) return "";
  if (isDevelopment) return key;
  const okLive = key.startsWith("pk_live_");
  const okTest = key.startsWith("pk_test_");
  if (mode === "live" && !okLive) return "";
  if (mode === "test" && !okTest) return "";
  return key;
}

/**
 * Clé publique pour Stripe.js selon le mode site (aligné sur `sites.stripe_mode`).
 * - test → VITE_STRIPE_PUBLISHABLE_KEY_TEST puis (dev seulement) VITE_STRIPE_PUBLISHABLE_KEY
 * - live → VITE_STRIPE_PUBLISHABLE_KEY_LIVE puis (dev seulement) VITE_STRIPE_PUBLISHABLE_KEY
 * Hors dev : la clé doit commencer par `pk_live_` ou `pk_test_` selon le mode.
 */
export function resolvePublishableKey(mode: "live" | "test"): string {
  const generic = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
  if (mode === "test") {
    const test = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST);
    const raw = test || (allowGenericPublishableKeyFallback && generic ? generic : "");
    return enforcePublishablePrefix("test", raw);
  }
  const live = trimEnv(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE);
  const raw = live || (allowGenericPublishableKeyFallback && generic ? generic : "");
  return enforcePublishablePrefix("live", raw);
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
