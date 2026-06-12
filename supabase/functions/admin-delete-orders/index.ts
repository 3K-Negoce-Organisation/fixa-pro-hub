import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_BATCH = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { order_ids } = await req.json();
    if (!Array.isArray(order_ids) || order_ids.length === 0) {
      return new Response(JSON.stringify({ error: "order_ids requis (tableau non vide)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (order_ids.length > MAX_BATCH) {
      return new Response(JSON.stringify({ error: `Maximum ${MAX_BATCH} commandes par suppression` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uniqueIds = [...new Set(order_ids.map((id: unknown) => String(id).trim()).filter(Boolean))];
    if (uniqueIds.length === 0) {
      return new Response(JSON.stringify({ error: "Aucun identifiant valide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orders, error: fetchError } = await auth.supabaseAdmin
      .from("orders")
      .select("id, order_number, is_archived")
      .in("id", uniqueIds);

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const found = orders || [];
    if (found.length !== uniqueIds.length) {
      return new Response(JSON.stringify({ error: "Certaines commandes sont introuvables" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notArchived = found.filter((o) => o.is_archived !== true);
    if (notArchived.length > 0) {
      return new Response(JSON.stringify({
        error: "Seules les commandes archivées peuvent être supprimées définitivement",
        not_archived: notArchived.map((o) => o.order_number),
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: deleteError } = await auth.supabaseAdmin
      .from("orders")
      .delete()
      .in("id", uniqueIds);

    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      deleted_count: uniqueIds.length,
      deleted_order_numbers: found.map((o) => o.order_number),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-delete-orders]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
