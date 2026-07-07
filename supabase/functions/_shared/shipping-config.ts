import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { roundMoney } from "./money.ts";

export const DEFAULT_FREE_SHIPPING_THRESHOLD_TTC = 150;
export const DEFAULT_SHIPPING_FEE_TTC = 12;

export type ShippingConfig = {
  freeShippingThresholdTtc: number;
  defaultShippingFeeTtc: number;
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  freeShippingThresholdTtc: DEFAULT_FREE_SHIPPING_THRESHOLD_TTC,
  defaultShippingFeeTtc: DEFAULT_SHIPPING_FEE_TTC,
};

function parsePositiveAmount(value: unknown, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return roundMoney(num);
}

export function shippingConfigFromRow(
  row: {
    free_shipping_threshold?: unknown;
    default_shipping_fee?: unknown;
  } | null | undefined,
): ShippingConfig {
  if (!row) return DEFAULT_SHIPPING_CONFIG;
  return {
    freeShippingThresholdTtc: parsePositiveAmount(
      row.free_shipping_threshold,
      DEFAULT_FREE_SHIPPING_THRESHOLD_TTC,
    ),
    defaultShippingFeeTtc: parsePositiveAmount(
      row.default_shipping_fee,
      DEFAULT_SHIPPING_FEE_TTC,
    ),
  };
}

export function shippingConfigFromMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): ShippingConfig {
  if (!metadata) return DEFAULT_SHIPPING_CONFIG;
  return {
    freeShippingThresholdTtc: parsePositiveAmount(
      metadata.free_shipping_threshold_ttc,
      DEFAULT_FREE_SHIPPING_THRESHOLD_TTC,
    ),
    defaultShippingFeeTtc: parsePositiveAmount(
      metadata.default_shipping_fee_ttc,
      DEFAULT_SHIPPING_FEE_TTC,
    ),
  };
}

export function shippingConfigMetadata(config: ShippingConfig): Record<string, string> {
  return {
    free_shipping_threshold_ttc: config.freeShippingThresholdTtc.toFixed(2),
    default_shipping_fee_ttc: config.defaultShippingFeeTtc.toFixed(2),
  };
}

export async function loadShippingConfigForSite(
  supabase: SupabaseClient,
  siteId: string | null | undefined,
): Promise<ShippingConfig> {
  let query = supabase
    .from("supplier_settings")
    .select("free_shipping_threshold, default_shipping_fee");

  if (siteId) {
    query = query.eq("site_id", siteId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    console.warn("[shipping-config] load failed:", error.message);
    return DEFAULT_SHIPPING_CONFIG;
  }
  return shippingConfigFromRow(data);
}
