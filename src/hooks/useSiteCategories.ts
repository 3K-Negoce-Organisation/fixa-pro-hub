import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";

export type SiteCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order?: number | null;
  image_url?: string | null;
  show_on_homepage?: boolean | null;
  /** Gamme parente (via category_product). */
  gamme_id?: string | null;
  category_product_id?: string | null;
  site_id?: string | null;
};

const DEFAULT_SELECT =
  "id, name, slug, sort_order, image_url, show_on_homepage, category_product_id, site_id";

const DEFAULT_GAMME_SLUG = "vissage";

type DbClient = typeof supabase & {
  from: (table: string) => ReturnType<typeof supabase.from>;
};

async function resolveSiteGammeId(siteId: string | null): Promise<string | null> {
  const db = supabase as DbClient;
  if (siteId) {
    const { data: site, error } = await db
      .from("sites")
      .select("gamme_id")
      .eq("id", siteId)
      .maybeSingle();
    if (error) throw error;
    if (site?.gamme_id) return site.gamme_id as string;
  }

  const { data: gamme, error: gammeError } = await db
    .from("gammes")
    .select("id")
    .eq("slug", DEFAULT_GAMME_SLUG)
    .maybeSingle();
  if (gammeError) throw gammeError;
  return (gamme?.id as string | undefined) ?? null;
}

async function fetchSubCategoriesByIds(
  db: DbClient,
  select: string,
  cpIds: string[],
  extra?: { siteId?: string | null; siteScopedOnly?: boolean },
): Promise<SiteCategory[]> {
  if (cpIds.length === 0) return [];

  let q = db
    .from("sub_category")
    .select(select)
    .eq("is_active", true)
    .in("category_product_id", cpIds)
    .order("sort_order", { ascending: true });

  if (extra?.siteScopedOnly && extra.siteId) {
    q = q.eq("site_id", extra.siteId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as SiteCategory[];
}

/**
 * Sous-catégories vitrine : `sub_category` liées à la gamme du site
 * via `category_product.gamme_id`.
 * Priorité aux lignes scopées au site (ex. buckets marketing Vis-à-Bois),
 * sinon toutes les sub_category actives de la gamme.
 */
export async function fetchSiteCategories(
  siteId: string | null,
  select = DEFAULT_SELECT,
): Promise<SiteCategory[]> {
  const db = supabase as DbClient;
  const gammeId = await resolveSiteGammeId(siteId);
  if (!gammeId) return [];

  const { data: cps, error: cpError } = await db
    .from("category_product")
    .select("id")
    .eq("gamme_id", gammeId)
    .eq("is_active", true);
  if (cpError) throw cpError;

  const cpIds = (cps || []).map((row) => row.id as string).filter(Boolean);
  if (cpIds.length === 0) return [];

  if (siteId) {
    const scoped = await fetchSubCategoriesByIds(db, select, cpIds, {
      siteId,
      siteScopedOnly: true,
    });
    if (scoped.length > 0) {
      return scoped.map((row) => ({ ...row, gamme_id: gammeId }));
    }
  }

  const rows = await fetchSubCategoriesByIds(db, select, cpIds);
  return rows.map((row) => ({ ...row, gamme_id: gammeId }));
}

/** Catégories éligibles à la grille d'accueil : switch en ligne + image. */
export function filterHomepageCategories(categories: SiteCategory[]): SiteCategory[] {
  return categories.filter(
    (cat) => Boolean(cat.show_on_homepage) && Boolean(cat.image_url?.trim()),
  );
}

export function useSiteCategories(select = DEFAULT_SELECT) {
  const { siteId, loading: siteLoading } = useStorefrontSite();

  return useQuery({
    queryKey: ["sub-categories", siteId, select],
    queryFn: () => fetchSiteCategories(siteId, select),
    staleTime: 5 * 60 * 1000,
    enabled: !siteLoading,
  });
}

export { resolveSiteGammeId };
