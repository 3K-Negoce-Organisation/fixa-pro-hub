import { useCallback, useEffect, useState } from "react";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";

export type SiteStripeMode = "live" | "test";

/**
 * Lit `public.sites.stripe_mode` pour le site storefront sélectionné.
 */
export function useSiteStripeMode(enabled = true) {
  const { site, loading, refreshSite } = useStorefrontSite();
  const [stripeMode, setStripeMode] = useState<SiteStripeMode | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    await refreshSite();
    const mode = site?.stripe_mode === "test" ? "test" : "live";
    setStripeMode(mode);
  }, [enabled, refreshSite, site?.stripe_mode]);

  useEffect(() => {
    if (!enabled) {
      setStripeMode(null);
      return;
    }
    if (loading) return;
    setStripeMode(site?.stripe_mode === "test" ? "test" : "live");
  }, [enabled, loading, site?.stripe_mode]);

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
