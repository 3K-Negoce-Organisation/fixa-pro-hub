/** Arrondi monétaire à 2 décimales (Edge Functions). */
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
