export const TREX_FALLBACK_SRC = "/trex-fallback.png";

export function resolveProductImageUrl(url?: string | null): string {
  const trimmed = String(url ?? "").trim();
  return trimmed || TREX_FALLBACK_SRC;
}
