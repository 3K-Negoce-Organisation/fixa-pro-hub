/**
 * URLs / marques vitrine par site (paiements Stripe multi-domaines).
 * Override possible via secrets :
 * - STOREFRONT_URL_VIS_A_BOIS, STOREFRONT_URL_3K_NEGOCE
 * - STOREFRONT_URL (repli global, historique)
 */

export const DEFAULT_STOREFRONT_BY_SLUG: Record<string, string> = {
  "vis-a-bois": "https://www.vis-a-bois.com",
  "3k-negoce": "https://www.3k-negoce.com",
};

export const DEFAULT_BRAND_BY_SLUG: Record<string, string> = {
  "vis-a-bois": "Vis-à-Bois",
  "3k-negoce": "3K-Négoce",
};

function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function envUrl(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

/** URL publique canonique pour un slug site. */
export function storefrontUrlForSlug(slug: string | null | undefined): string {
  const key = (slug || "").trim().toLowerCase();
  if (key === "vis-a-bois") {
    return trimSlash(envUrl("STOREFRONT_URL_VIS_A_BOIS") || DEFAULT_STOREFRONT_BY_SLUG["vis-a-bois"]);
  }
  if (key === "3k-negoce") {
    return trimSlash(envUrl("STOREFRONT_URL_3K_NEGOCE") || DEFAULT_STOREFRONT_BY_SLUG["3k-negoce"]);
  }
  const fallback = envUrl("STOREFRONT_URL") || DEFAULT_STOREFRONT_BY_SLUG["vis-a-bois"];
  return trimSlash(fallback);
}

/** Libellé marque pour emails / docs. */
export function storefrontBrandForSlug(slug: string | null | undefined): string {
  const key = (slug || "").trim().toLowerCase();
  if (key === "3k-negoce") {
    return (Deno.env.get("STOREFRONT_BRAND_NAME_3K") || DEFAULT_BRAND_BY_SLUG["3k-negoce"]).trim();
  }
  if (key === "vis-a-bois") {
    return (Deno.env.get("STOREFRONT_BRAND_NAME_VIS") || DEFAULT_BRAND_BY_SLUG["vis-a-bois"]).trim();
  }
  return (Deno.env.get("STOREFRONT_BRAND_NAME") || DEFAULT_BRAND_BY_SLUG["vis-a-bois"]).trim();
}

/** Hôte affiché dans les emails (sans https://). */
export function storefrontHostForSlug(slug: string | null | undefined): string {
  try {
    return new URL(storefrontUrlForSlug(slug)).host;
  } catch {
    return "vis-a-bois.com";
  }
}

type SitesQueryClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { slug?: string } | null; error: unknown }>;
      };
    };
  };
};

/** Résout l’URL vitrine depuis `orders.site_id`. */
export async function resolveStorefrontUrlForSiteId(
  supabaseAdmin: SitesQueryClient,
  siteId: string | null | undefined,
): Promise<string> {
  const slug = await resolveSiteSlug(supabaseAdmin, siteId);
  return storefrontUrlForSlug(slug);
}

export async function resolveSiteSlug(
  supabaseAdmin: SitesQueryClient,
  siteId: string | null | undefined,
): Promise<string | null> {
  if (!siteId) return null;
  const { data } = await supabaseAdmin
    .from("sites")
    .select("slug")
    .eq("id", siteId)
    .maybeSingle();
  return data?.slug?.trim() || null;
}

export async function resolveStorefrontBrandForSiteId(
  supabaseAdmin: SitesQueryClient,
  siteId: string | null | undefined,
): Promise<string> {
  const slug = await resolveSiteSlug(supabaseAdmin, siteId);
  return storefrontBrandForSlug(slug);
}

export async function resolveStorefrontHostForSiteId(
  supabaseAdmin: SitesQueryClient,
  siteId: string | null | undefined,
): Promise<string> {
  const slug = await resolveSiteSlug(supabaseAdmin, siteId);
  return storefrontHostForSlug(slug);
}

const EXTRA_ALLOWED_ORIGINS = new Set([
  "https://vis-a-bois.com",
  "https://3k-negoce.com",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
]);

function knownStorefrontOrigins(): Set<string> {
  const set = new Set<string>(EXTRA_ALLOWED_ORIGINS);
  for (const url of Object.values(DEFAULT_STOREFRONT_BY_SLUG)) {
    set.add(trimSlash(url));
  }
  for (const envName of ["STOREFRONT_URL", "STOREFRONT_URL_VIS_A_BOIS", "STOREFRONT_URL_3K_NEGOCE"]) {
    const v = envUrl(envName);
    if (v) set.add(trimSlash(v));
  }
  return set;
}

/**
 * Origin pour success_url / cancel_url Stripe Checkout.
 * Accepte l’Origin navigateur s’il correspond à une vitrine connue (ou Railway / localhost),
 * sinon l’URL du site (slug) — Vis-à-Bois et 3K restent tous deux valides.
 */
export function resolveCheckoutOrigin(
  requestOrigin: string | null | undefined,
  siteSlug: string | null | undefined,
): string {
  const origin = trimSlash((requestOrigin || "").trim());
  if (origin) {
    const allowed = knownStorefrontOrigins();
    if (allowed.has(origin)) return origin;
    try {
      const host = new URL(origin).hostname;
      if (
        host.endsWith(".up.railway.app")
        || host === "localhost"
        || host === "127.0.0.1"
      ) {
        return origin;
      }
    } catch {
      /* ignore */
    }
  }
  return storefrontUrlForSlug(siteSlug);
}
