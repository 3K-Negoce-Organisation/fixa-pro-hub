import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_SLUG } from "@/lib/siteSlug";

/**
 * Reads `sites.storefront_public` for the storefront slug.
 * On any failure (missing migration, RLS, réseau, colonne absente), returns **false**
 * so the app se comporte comme « boutique fermée » : pas de page d’erreur bloquante.
 */
export function useStorefrontPublic() {
  return useQuery({
    queryKey: ["storefront-public", SITE_SLUG],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("sites")
          .select("storefront_public")
          .eq("slug", SITE_SLUG)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.warn("[storefront-public] lecture sites échouée, accès public désactivé par défaut:", error.message);
          return false;
        }
        return Boolean(data?.storefront_public);
      } catch (e) {
        console.warn("[storefront-public] exception, accès public désactivé par défaut:", e);
        return false;
      }
    },
    staleTime: 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
  });
}
