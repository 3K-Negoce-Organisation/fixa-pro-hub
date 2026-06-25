import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  buildMerchantFeedTsv,
  type MerchantFeedProduct,
} from "../_shared/google-merchant-feed.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response("Configuration Supabase manquante", { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { data: products, error } = await supabase
      .from("products")
      .select(
        "id, handle, title, description, designation_fr, price_ttc, price_ht, promo_price_ht, is_promo, stock, images, ean, code_alsafix, category, material, is_active",
      )
      .eq("is_active", true)
      .order("title");

    if (error) {
      console.error("[google-merchant-feed]", error);
      return new Response("Erreur lecture produits", { status: 500 });
    }

    const tsv = buildMerchantFeedTsv((products ?? []) as MerchantFeedProduct[]);

    return new Response(tsv, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/tab-separated-values; charset=utf-8",
        "Content-Disposition": 'inline; filename="google-merchant-feed.tsv"',
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[google-merchant-feed]", error);
    return new Response("Génération feed impossible", { status: 500 });
  }
});
