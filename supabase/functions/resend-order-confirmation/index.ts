import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { sendOrderConfirmationForOrderNumber } from "../_shared/order-confirmation-from-order.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAdmin = createClient(supabaseUrl, token, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: probeError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .limit(1);
    if (probeError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as { order_number?: string; order_numbers?: string[] };
    const numbers = [
      ...(body.order_numbers ?? []),
      ...(body.order_number ? [body.order_number] : []),
    ].map((n) => n.trim().toUpperCase()).filter(Boolean);

    if (numbers.length === 0) {
      return new Response(JSON.stringify({ error: "order_number ou order_numbers requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const orderNumber of numbers) {
      const result = await sendOrderConfirmationForOrderNumber(supabaseAdmin, orderNumber);
      results.push(result);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
