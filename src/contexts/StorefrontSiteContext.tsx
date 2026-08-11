import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_STOREFRONT_SITE_SLUG,
  normalizeSiteSlug,
  readStoredSiteSlug,
  writeStoredSiteSlug,
} from "@/lib/storefrontSite";

export type StorefrontSiteRow = {
  id: string;
  slug: string;
  name: string;
  storefront_public?: boolean;
  stripe_mode?: "live" | "test";
  home_visual?: string | null;
  /** Gamme catalogue → sub_category via category_product. */
  gamme_id?: string | null;
};

type StorefrontSiteContextValue = {
  siteSlug: string;
  siteId: string | null;
  site: StorefrontSiteRow | null;
  loading: boolean;
  setSiteSlug: (slug: string) => void;
  refreshSite: () => Promise<void>;
};

const StorefrontSiteContext = createContext<StorefrontSiteContextValue | undefined>(undefined);

async function fetchSiteBySlug(slug: string): Promise<StorefrontSiteRow | null> {
  const { data, error } = await supabase
    .from("sites")
    .select("id, slug, name, storefront_public, stripe_mode, home_visual, gamme_id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn("[storefront-site] lecture site échouée:", error.message);
    return null;
  }
  return data as StorefrontSiteRow | null;
}

export function StorefrontSiteProvider({ children }: { children: ReactNode }) {
  const [siteSlug, setSiteSlugState] = useState(readStoredSiteSlug);
  const [site, setSite] = useState<StorefrontSiteRow | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSite = useCallback(async (slug: string) => {
    setLoading(true);
    const normalized = normalizeSiteSlug(slug) || DEFAULT_STOREFRONT_SITE_SLUG;
    let row = await fetchSiteBySlug(normalized);

    if (!row && normalized !== DEFAULT_STOREFRONT_SITE_SLUG) {
      writeStoredSiteSlug(DEFAULT_STOREFRONT_SITE_SLUG);
      setSiteSlugState(DEFAULT_STOREFRONT_SITE_SLUG);
      row = await fetchSiteBySlug(DEFAULT_STOREFRONT_SITE_SLUG);
    } else {
      writeStoredSiteSlug(normalized);
      setSiteSlugState(normalized);
    }

    setSite(row);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadSite(siteSlug);
  }, [siteSlug, loadSite]);

  const setSiteSlug = useCallback((slug: string) => {
    const normalized = normalizeSiteSlug(slug) || DEFAULT_STOREFRONT_SITE_SLUG;
    writeStoredSiteSlug(normalized);
    setSiteSlugState(normalized);
  }, []);

  const value = useMemo(
    () => ({
      siteSlug,
      siteId: site?.id ?? null,
      site,
      loading,
      setSiteSlug,
      refreshSite: () => loadSite(siteSlug),
    }),
    [siteSlug, site, loading, setSiteSlug, loadSite],
  );

  return (
    <StorefrontSiteContext.Provider value={value}>{children}</StorefrontSiteContext.Provider>
  );
}

export function useStorefrontSite() {
  const context = useContext(StorefrontSiteContext);
  if (context === undefined) {
    throw new Error("useStorefrontSite must be used within a StorefrontSiteProvider");
  }
  return context;
}
