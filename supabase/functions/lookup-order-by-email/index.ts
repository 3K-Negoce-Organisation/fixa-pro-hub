import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_SLUG = Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: u } = await supabaseAnon.auth.getUser(token);
      if (u.user) {
        return new Response(JSON.stringify({ error: "Utilisez votre espace connecté pour le suivi." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { order_number: rawOrder, email: rawEmail } = await req.json() as {
      order_number?: string;
      email?: string;
    };

    const order_number = (rawOrder ?? "").trim().toUpperCase();
    const email = (rawEmail ?? "").trim().toLowerCase();

    if (!order_number || !email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Numéro de commande et email requis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    const { data: site, error: siteErr } = await admin
      .from("sites")
      .select("storefront_public")
      .eq("slug", SITE_SLUG)
      .eq("is_active", true)
      .maybeSingle();

    if (siteErr) throw siteErr;
    if (!site?.storefront_public) {
      return new Response(JSON.stringify({ error: "Non disponible." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("*")
      .eq("order_number", order_number)
      .maybeSingle();

    if (orderErr) throw orderErr;

    const orderEmail = (order?.user_email as string | null)?.trim().toLowerCase() ?? "";
    if (!order || orderEmail !== email) {
      return new Response(JSON.stringify({ error: "Commande introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order_items, error: itemsErr } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);

    if (itemsErr) throw itemsErr;

    return new Response(JSON.stringify({ order, order_items: order_items ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
