const GENERIC_VARIANT_TITLES = new Set(["default", "unité", "unite"]);

export function getDisplayVariantTitle(title: string | null | undefined): string | null {
  const t = (title || "").trim();
  if (!t || GENERIC_VARIANT_TITLES.has(t.toLowerCase())) return null;
  return t;
}
