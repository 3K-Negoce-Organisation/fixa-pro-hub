import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Arrondi monétaire à 2 décimales (évite 57.99999999999999). */
export function roundMoney(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function roundMoneyOrNull(
  value: number | null | undefined,
  decimals = 2,
): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return roundMoney(n, decimals);
}

export type ProductMoneyFields = {
  price_ht?: number | null;
  price_ttc?: number | null;
  purchase_price_ht?: number | null;
  promo_price_ht?: number | null;
};

export function normalizeProductMoneyFields<T extends ProductMoneyFields>(product: T): T {
  const out = { ...product };
  if (product.price_ht !== undefined && product.price_ht !== null) {
    out.price_ht = roundMoney(Number(product.price_ht));
  }
  if (product.price_ttc !== undefined && product.price_ttc !== null) {
    out.price_ttc = roundMoney(Number(product.price_ttc));
  }
  if (product.purchase_price_ht !== undefined) {
    out.purchase_price_ht = roundMoneyOrNull(product.purchase_price_ht);
  }
  if (product.promo_price_ht !== undefined && product.promo_price_ht !== null) {
    out.promo_price_ht = roundMoney(Number(product.promo_price_ht));
  }
  return out;
}
