/** Même périmètre que `src/lib/visABoisCatalog.ts`, pour le sitemap et le manifeste SEO (build). */
export const VIS_A_BOIS_SITE_SLUG = "vis-a-bois";
export const CATALOG_SITE_SLUG = "3k-negoce";

async function siteIdBySlug(supabase, slug) {
  const { data, error } = await supabase.from("sites").select("id").eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!data?.id) throw new Error(`Site ${slug} introuvable`);
  return data.id;
}

export async function loadVisABoisCatalog(supabase) {
  const storefrontSiteId = await siteIdBySlug(supabase, VIS_A_BOIS_SITE_SLUG);
  const catalogSiteId = await siteIdBySlug(supabase, CATALOG_SITE_SLUG);

  const { data: categories, error } = await supabase
    .from("categories")
    .select("id, slug, name")
    .eq("site_id", storefrontSiteId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;

  return { storefrontSiteId, catalogSiteId, categories: categories ?? [] };
}

export async function fetchCatalogProducts(supabase, scope, select) {
  const categoryIds = scope.categories.map((c) => c.id).filter(Boolean);
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
