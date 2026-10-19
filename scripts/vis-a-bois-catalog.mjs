/** Même périmètre que `src/lib/visABoisCatalog.ts` (sitemap et manifeste SEO). */
export const VIS_A_BOIS_SITE_SLUG = "vis-a-bois";
export const CATALOG_SITE_SLUG = "3k-negoce";

export async function loadVisABoisCatalog(supabase) {
  const { data: storefront, error: storefrontError } = await supabase
    .from("sites")
    .select("id")
    .eq("slug", VIS_A_BOIS_SITE_SLUG)
    .maybeSingle();
  if (storefrontError) throw storefrontError;
  if (!storefront?.id) throw new Error("Site vis-a-bois introuvable");

  const { data: catalog, error: catalogError } = await supabase
    .from("sites")
    .select("id")
    .eq("slug", CATALOG_SITE_SLUG)
    .maybeSingle();
  if (catalogError) throw catalogError;
  if (!catalog?.id) throw new Error("Site catalogue 3k-negoce introuvable");

  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("site_id", storefront.id)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (catError) throw catError;

  return {
    storefrontSiteId: storefront.id,
    catalogSiteId: catalog.id,
    categories: categories ?? [],
  };
}

export async function fetchCatalogProducts(supabase, scope, select) {
  const categoryIds = scope.categories.map((category) => category.id).filter(Boolean);
  if (categoryIds.length === 0) return [];

  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select(select)
      .eq("is_active", true)
      .eq("validated", "yes")
      .eq("site_id", scope.catalogSiteId)
      .in("category_id", categoryIds)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return rows;
}
