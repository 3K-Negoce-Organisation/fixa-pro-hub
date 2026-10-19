import { supabase } from "@/integrations/supabase/client";

/**
 * Vitrine Vis-à-Bois : elle n'a plus de produits propres (products.site_id).
 * Elle affiche le catalogue commun du site 3k-negoce, limité aux produits
 * dont `products.category_id` est l'un des rayons `categories` du site vis-a-bois.
 */
export const VIS_A_BOIS_SITE_SLUG = "vis-a-bois";
export const CATALOG_SITE_SLUG = "3k-negoce";

export function isVisABoisStorefront(siteSlug: string | null | undefined): boolean {
  return siteSlug === VIS_A_BOIS_SITE_SLUG;
}

export type VisABoisCatalogScope = {
  catalogSiteId: string;
  categoryIds: string[];
};

// Tables hors types générés (`categories`) → client non typé.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const scopeCache = new Map<string, Promise<VisABoisCatalogScope>>();

async function fetchScope(storefrontSiteId: string): Promise<VisABoisCatalogScope> {
  const { data: catalog, error: catalogError } = await db
    .from("sites")
    .select("id")
    .eq("slug", CATALOG_SITE_SLUG)
    .maybeSingle();
  if (catalogError) throw catalogError;
  if (!catalog?.id) throw new Error("Site catalogue 3k-negoce introuvable");

  const { data: rayons, error: rayonsError } = await db
    .from("categories")
    .select("id")
    .eq("site_id", storefrontSiteId)
    .eq("is_active", true);
  if (rayonsError) throw rayonsError;

  return {
    catalogSiteId: catalog.id as string,
    categoryIds: ((rayons ?? []) as Array<{ id: string }>).map((r) => r.id).filter(Boolean),
  };
}

export function loadVisABoisCatalogScope(storefrontSiteId: string): Promise<VisABoisCatalogScope> {
  const cached = scopeCache.get(storefrontSiteId);
  if (cached) return cached;
  const pending = fetchScope(storefrontSiteId).catch((error) => {
    scopeCache.delete(storefrontSiteId);
    throw error;
  });
  scopeCache.set(storefrontSiteId, pending);
  return pending;
}

/**
 * Applique le périmètre vitrine à une requête `products`.
 * - Vis-à-Bois : catalogue 3k-negoce, produits validés, rayons du site.
 * - Autres vitrines : filtre historique `products.site_id`.
 *
 * Le builder PostgREST est « thenable » : on le renvoie dans un objet pour
 * qu'une fonction async ne l'exécute pas avant les filtres suivants.
 * Retourne null s'il n'y a rien à afficher (aucun rayon / site inconnu).
 */
export async function scopeStorefrontProducts<Q>(
  query: Q,
  siteId?: string | null,
  siteSlug?: string | null,
): Promise<{ query: Q } | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any;
  if (!isVisABoisStorefront(siteSlug)) {
    return { query: siteId ? q.eq("site_id", siteId) : q };
  }
  if (!siteId) return null;

  const scope = await loadVisABoisCatalogScope(siteId);
  if (scope.categoryIds.length === 0) return null;

  return {
    query: q
      .eq("site_id", scope.catalogSiteId)
      .eq("validated", "yes")
      .in("category_id", scope.categoryIds),
  };
}
