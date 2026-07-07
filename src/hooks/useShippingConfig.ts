import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import {
  DEFAULT_SHIPPING_CONFIG,
  shippingConfigFromRow,
  type ShippingConfig,
} from "@/lib/shipping";

export function useShippingConfig() {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const [config, setConfig] = useState<ShippingConfig>(DEFAULT_SHIPPING_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      let query = supabase
        .from("supplier_settings")
        .select("free_shipping_threshold, default_shipping_fee");

      if (siteId) {
        query = query.eq("site_id", siteId);
      }

      const { data, error } = await query.maybeSingle();
      if (cancelled) return;

      if (error) {
        console.warn("[shipping-config] load failed:", error.message);
        setConfig(DEFAULT_SHIPPING_CONFIG);
      } else {
        setConfig(shippingConfigFromRow(data));
      }
      setLoading(false);
    }

    if (!siteLoading) {
      void load();
    }

    return () => {
      cancelled = true;
    };
  }, [siteId, siteLoading]);

  return {
    config,
    loading: loading || siteLoading,
  };
}
