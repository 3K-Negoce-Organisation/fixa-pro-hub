import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SITE_SLUG } from "@/lib/siteSlug";

export function useStorefrontPublic() {
  return useQuery({
    queryKey: ["storefront-public", SITE_SLUG],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sites")
        .select("storefront_public")
        .eq("slug", SITE_SLUG)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return Boolean(data?.storefront_public);
    },
    staleTime: 60 * 1000,
  });
}
