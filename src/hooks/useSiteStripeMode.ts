import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE_SLUG } from "@/lib/siteSlug";

export type SiteStripeMode = "live" | "test";

/**
 * Lit `public.sites.stripe_mode` pour le storefront (`SITE_SLUG` / `VITE_SITE_SLUG`).
 * Le serveur (Edge Functions) reste la source de vérité pour les secrets ; ce hook sert uniquement au choix de la clé publique et à l’UX (bandeau test).
 */
export function useSiteStripeMode(enabled = true) {
  const [stripeMode, setStripeMode] = useState<SiteStripeMode | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    const { data, error } = await supabase
      .from("sites")
      .select("stripe_mode")
      .eq("slug", SITE_SLUG)
      .eq("is_active", true)
      .maybeSingle();

    if (error) {
      console.warn("[STRIPE] Could not load sites.stripe_mode, defaulting to live", error);
      setStripeMode("live");
      return;
    }
    const mode = (data as { stripe_mode?: string } | null)?.stripe_mode === "test" ? "test" : "live";
    setStripeMode(mode);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setStripeMode(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [enabled, load]);

  return { stripeMode, refetch: load };
}
