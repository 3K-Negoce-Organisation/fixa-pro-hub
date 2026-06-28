export const DEFAULT_STOREFRONT_SITE_SLUG = "vis-a-bois";
export const STOREFRONT_SITE_SLUG_KEY = "storefront_site_slug";

export function normalizeSiteSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function readStoredSiteSlug(): string {
  if (typeof sessionStorage === "undefined") return DEFAULT_STOREFRONT_SITE_SLUG;
  const stored = sessionStorage.getItem(STOREFRONT_SITE_SLUG_KEY)?.trim();
  return stored ? normalizeSiteSlug(stored) : DEFAULT_STOREFRONT_SITE_SLUG;
}

export function writeStoredSiteSlug(slug: string): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(STOREFRONT_SITE_SLUG_KEY, normalizeSiteSlug(slug));
}

/** GET ?site=slug → sessionStorage puis URL nettoyée (dès le premier import du module). */
export function bootstrapSiteFromUrl(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const siteParam = url.searchParams.get("site");
  if (!siteParam?.trim()) return;

  writeStoredSiteSlug(normalizeSiteSlug(siteParam) || DEFAULT_STOREFRONT_SITE_SLUG);
  url.searchParams.delete("site");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

if (typeof window !== "undefined") {
  bootstrapSiteFromUrl();
}
