import { supabase } from "@/integrations/supabase/client";

/** Vitrine Vis-à-Bois : les rayons vivent dans `categories` (site vis-a-bois). */
export const VIS_A_BOIS_SITE_SLUG = "vis-a-bois";
/** Catalogue commun : les fiches actives validées sont sur le site 3k-negoce. */
export const CATALOG_SITE_SLUG = "3k-negoce";

export function isVisABoisStorefront(siteSlug: string | null | undefined): boolean {
  return siteSlug === VIS_A_BOIS_SITE_SLUG;
}

export type VisABoisCatalogScope = {
  catalogSiteId: string;
  categoryIds: string[];
};

const scopeCache = new Map<string, Promise<VisABoisCatalogScope>>();

async function fetchVisABoisCatalogScope(storefrontSiteId: string): Promise<VisABoisCatalogScope> {
  const db = supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (column: string, value: string | boolean) => {
          eq: (column: string, value: string | boolean) => Promise<{
            data: Array<{ id: string }> | null;
            error: { message: string } | null;
          }>;
          maybeSingle: () => Promise<{
            data: { id: string } | null;
            error: { message: string } | null;
          }>;
        };
      };
    };
  };

  const catalogResult = await db
    .from("sites")
    .select("id")
    .eq("slug", CATALOG_SITE_SLUG)
    .maybeSingle();
  if (catalogResult.error) throw catalogResult.error;
  if (!catalogResult.data?.id) {
    throw new Error("Site catalogue 3k-negoce introuvable");
  }

  const categoriesResult = await db
    .from("categories")
    .select("id")
    .eq("site_id", storefrontSiteId)
    .eq("is_active", true);
  if (categoriesResult.error) throw categoriesResult.error;

  return {
    catalogSiteId: catalogResult.data.id,
    categoryIds: (categoriesResult.data ?? []).map((row) => row.id).filter(Boolean),
  };
}

export function loadVisABoisCatalogScope(storefrontSiteId: string): Promise<VisABoisCatalogScope> {
  const cached = scopeCache.get(storefrontSiteId);
  if (cached) return cached;

  const pending = fetchVisABoisCatalogScope(storefrontSiteId).catch((error) => {
    scopeCache.delete(storefrontSiteId);
    throw error;
  });
  scopeCache.set(storefrontSiteId, pending);
  return pending;
}

/**
 * Vis-à-Bois lit le catalogue 3k-negoce limité aux rayons `categories` du site.
 * Les autres vitrines restent filtrées par leur propre `products.site_id`.
 * Retourne null s'il n'y a aucun rayon : l'appelant affiche une liste vide.
 *
 * Le builder PostgREST est thenable : on l'enveloppe pour qu'une fonction async
 * ne lance pas la requête avant les filtres suivants (recherche, promo).
 */
export async function scopeStorefrontProducts(
  query: any,
  siteId?: string | null,
  siteSlug?: string | null,
): Promise<{ query: any } | null> {
  if (!isVisABoisStorefront(siteSlug)) {
    if (siteId) return { query: query.eq("site_id", siteId) };
    return { query };
  }

  if (!siteId) return null;

  const scope = await loadVisABoisCatalogScope(siteId);
  if (scope.categoryIds.length === 0) return null;

  return {
    query: query
      .eq("site_id", scope.catalogSiteId)
      .eq("validated", "yes")
      .in("category_id", scope.categoryIds),
  };
}
