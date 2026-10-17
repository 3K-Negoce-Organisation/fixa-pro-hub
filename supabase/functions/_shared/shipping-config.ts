import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { roundMoney } from "./money.ts";

const TVA_RATE = 0.2;

/** Politique : franco à partir de 150 € HT ; sinon 10 € HT de port. */
export const DEFAULT_FREE_SHIPPING_THRESHOLD_HT = 150;
export const DEFAULT_SHIPPING_FEE_HT = 10;

/** @deprecated alias — seuil en HT */
export const DEFAULT_FREE_SHIPPING_THRESHOLD_TTC = DEFAULT_FREE_SHIPPING_THRESHOLD_HT;
/** @deprecated alias — frais stockés historiquement en TTC (12 = 10 HT) */
export const DEFAULT_SHIPPING_FEE_TTC = roundMoney(
  DEFAULT_SHIPPING_FEE_HT * (1 + TVA_RATE),
);

export type ShippingConfig = {
  /** Seuil franco en HT */
  freeShippingThresholdHt: number;
  /** Frais de port en HT */
  defaultShippingFeeHt: number;
  /** Compat lecture anciens champs TTC */
  freeShippingThresholdTtc: number;
  defaultShippingFeeTtc: number;
};

export const DEFAULT_SHIPPING_CONFIG: ShippingConfig = {
  freeShippingThresholdHt: DEFAULT_FREE_SHIPPING_THRESHOLD_HT,
  defaultShippingFeeHt: DEFAULT_SHIPPING_FEE_HT,
  freeShippingThresholdTtc: DEFAULT_FREE_SHIPPING_THRESHOLD_HT,
  defaultShippingFeeTtc: DEFAULT_SHIPPING_FEE_TTC,
};

function parsePositiveAmount(value: unknown, fallback: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return roundMoney(num);
}

/**
 * `supplier_settings.free_shipping_threshold` = seuil HT.
 * `default_shipping_fee` historique = TTC (ex. 12) → converti en HT.
 */
export function shippingConfigFromRow(
  row: {
    free_shipping_threshold?: unknown;
    default_shipping_fee?: unknown;
  } | null | undefined,
): ShippingConfig {
  if (!row) return DEFAULT_SHIPPING_CONFIG;
  const thresholdHt = parsePositiveAmount(
    row.free_shipping_threshold,
    DEFAULT_FREE_SHIPPING_THRESHOLD_HT,
  );
  const feeRaw = parsePositiveAmount(
    row.default_shipping_fee,
    DEFAULT_SHIPPING_FEE_TTC,
  );
  // Si la valeur ressemble à un TTC (~12), convertir ; si déjà ~10 HT, garder.
  const feeHt =
    feeRaw >= 11
      ? roundMoney(feeRaw / (1 + TVA_RATE))
      : feeRaw;
  const feeTtc = roundMoney(feeHt * (1 + TVA_RATE));
  return {
    freeShippingThresholdHt: thresholdHt,
    defaultShippingFeeHt: feeHt,
    freeShippingThresholdTtc: thresholdHt,
    defaultShippingFeeTtc: feeTtc,
  };
}

export function shippingConfigFromMetadata(
  metadata: Record<string, string | undefined> | null | undefined,
): ShippingConfig {
  if (!metadata) return DEFAULT_SHIPPING_CONFIG;
  const thresholdHt = parsePositiveAmount(
    metadata.free_shipping_threshold_ht ?? metadata.free_shipping_threshold_ttc,
    DEFAULT_FREE_SHIPPING_THRESHOLD_HT,
  );
  const feeHt = parsePositiveAmount(
    metadata.default_shipping_fee_ht,
    parsePositiveAmount(
      metadata.default_shipping_fee_ttc != null
        ? Number(metadata.default_shipping_fee_ttc) / (1 + TVA_RATE)
        : DEFAULT_SHIPPING_FEE_HT,
      DEFAULT_SHIPPING_FEE_HT,
    ),
  );
  return {
    freeShippingThresholdHt: thresholdHt,
    defaultShippingFeeHt: feeHt,
    freeShippingThresholdTtc: thresholdHt,
    defaultShippingFeeTtc: roundMoney(feeHt * (1 + TVA_RATE)),
  };
}

export function shippingConfigMetadata(config: ShippingConfig): Record<string, string> {
  return {
    free_shipping_threshold_ht: config.freeShippingThresholdHt.toFixed(2),
    default_shipping_fee_ht: config.defaultShippingFeeHt.toFixed(2),
    free_shipping_threshold_ttc: config.freeShippingThresholdHt.toFixed(2),
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
