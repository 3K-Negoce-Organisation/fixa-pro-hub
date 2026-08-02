import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStorefrontSite } from "@/contexts/StorefrontSiteContext";
import { useSiteCategories } from "@/hooks/useSiteCategories";

export type StorefrontGammeStatus = "active" | "inactive" | "disabled";

export type MarketplaceUnivers = {
  slug: string;
  name: string;
  imageUrl?: string;
  ready: boolean;
  active: boolean;
};

const GAMME_SELECT =
  "id, name, slug, description, image_url, sort_order, is_active, storefront_status";

function normalizeGammeStatus(gamme: {
  storefront_status?: string | null;
  is_active?: boolean | null;
}): StorefrontGammeStatus {
  const status = gamme.storefront_status;
  if (status === "active" || status === "inactive" || status === "disabled") {
    return status;
  }
  return gamme.is_active === false ? "disabled" : "active";
}

async function fetchGammes() {
  const db = supabase as any;
  const { data, error } = await db
    .from("gammes")
    .select(GAMME_SELECT)
    .neq("storefront_status", "disabled")
    .order("sort_order", { ascending: true });

  if (error) {
    const fallback = await db
      .from("gammes")
      .select(GAMME_SELECT.replace(", storefront_status", ""))
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    if (fallback.error) throw error;
    return ((fallback.data || []) as Array<Record<string, unknown>>).filter(
      (row) => normalizeGammeStatus(row as never) !== "disabled",
    );
  }

  return ((data || []) as Array<Record<string, unknown>>).filter(
    (row) => normalizeGammeStatus(row as never) !== "disabled",
  );
}

export function useMarketplaceHome() {
  const { siteId, loading: siteLoading } = useStorefrontSite();
  const { data: gammes = [] } = useQuery({
    queryKey: ["gammes", GAMME_SELECT],
    queryFn: fetchGammes,
    staleTime: 5 * 60 * 1000,
  });
  const { data: categories = [] } = useSiteCategories("id, name, slug, gamme_id");

  const { data: productCount = 0 } = useQuery({
    queryKey: ["marketplace-product-count", siteId],
    enabled: !siteLoading && !!siteId,
    queryFn: async () => {
      let q = supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true);
      if (siteId) q = q.eq("site_id", siteId);
      const { count, error } = await q;
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: gammeCounts = {} } = useQuery({
    queryKey: [
      "marketplace-gamme-product-counts",
      siteId,
      gammes.map((g) => String((g as { id?: string }).id ?? "")).join(","),
    ],
    enabled: !siteLoading && !!siteId && gammes.length > 0 && categories.length > 0,
    queryFn: async () => {
      const byGamme = new Map<string, string[]>();
      for (const cat of categories) {
        const gammeId = cat.gamme_id;
        if (!gammeId) continue;
        const list = byGamme.get(gammeId) || [];
        list.push(cat.id);
        byGamme.set(gammeId, list);
      }

      const counts: Record<string, number> = {};
      await Promise.all(
        gammes.map(async (gamme) => {
          const row = gamme as { id: string; slug: string };
          const categoryIds = byGamme.get(row.id) || [];
          if (categoryIds.length === 0) {
            counts[row.slug] = 0;
            return;
          }
          let q = supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true)
            .in("category_id", categoryIds);
          if (siteId) q = q.eq("site_id", siteId);
          const { count, error } = await q;
          if (error) throw error;
          counts[row.slug] = count ?? 0;
        }),
      );
      return counts;
    },
  });

  const univers = useMemo<MarketplaceUnivers[]>(
    () =>
      gammes.map((gamme) => {
        const row = gamme as {
          id: string;
          slug: string;
          name: string;
          image_url?: string | null;
          storefront_status?: string | null;
          is_active?: boolean | null;
        };
        const status = normalizeGammeStatus(row);
        return {
          slug: row.slug,
          name: row.name,
          imageUrl: row.image_url || undefined,
          ready: (gammeCounts[row.slug] ?? 0) > 0,
          active: status === "active",
        };
      }),
    [gammes, gammeCounts],
  );

  return { univers, productCount };
}
