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
};

const DEFAULT_SELECT = "id, name, slug, sort_order, image_url, show_on_homepage";

export async function fetchSiteCategories(
  siteId: string | null,
  select = DEFAULT_SELECT,
): Promise<SiteCategory[]> {
  let q = supabase
    .from("categories")
    .select(select)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (siteId) {
    q = q.eq("site_id", siteId);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as SiteCategory[];
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
    queryKey: ["categories", siteId, select],
    queryFn: () => fetchSiteCategories(siteId, select),
    staleTime: 5 * 60 * 1000,
    enabled: !siteLoading,
  });
}
