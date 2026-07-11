import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyGuestOrderTrackingToken } from "../_shared/guest-order-tracking-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_number: rawOrder, email: rawEmail, token: rawToken } = await req.json() as {
      order_number?: string;
      email?: string;
      token?: string;
    };

    const order_number = (rawOrder ?? "").trim().toUpperCase();
    const email = (rawEmail ?? "").trim().toLowerCase();
    const token = (rawToken ?? "").trim();

    if (!order_number || !email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Numéro de commande et email requis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token) {
      return new Response(JSON.stringify({ error: "Lien de suivi invalide. Utilisez le lien reçu par email." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tokenValid = await verifyGuestOrderTrackingToken(order_number, email, token);
    if (!tokenValid) {
      return new Response(JSON.stringify({ error: "Lien de suivi invalide ou expiré." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

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

    const { data: status_events, error: eventsErr } = await admin
      .from("order_status_events")
      .select("id, status, event_kind, is_manual, note, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (eventsErr) throw eventsErr;

    return new Response(JSON.stringify({
      order,
      order_items: order_items ?? [],
      status_events: status_events ?? [],
    }), {
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
