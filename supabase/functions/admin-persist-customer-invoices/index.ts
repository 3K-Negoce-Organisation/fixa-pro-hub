import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";
import {
  orderEligibleForCustomerInvoice,
  orderHasStoredCustomerInvoice,
  persistCustomerInvoiceIfMissing,
} from "../_shared/persist-customer-invoice.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const authHeader = req.headers.get("Authorization");
    const isInternal = !!serviceKey && authHeader === `Bearer ${serviceKey}`;

    const auth = isInternal
      ? { ok: true as const, supabaseAdmin: createClient(supabaseUrl, serviceKey) }
      : await verifyAdminRequest(req);

    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderIds = Array.isArray(body.order_ids) ? body.order_ids as string[] : [];

    let query = auth.supabaseAdmin
      .from("orders")
      .select("*");

    if (orderIds.length > 0) {
      if (orderIds.length > MAX_BATCH) {
        return new Response(JSON.stringify({ error: `Maximum ${MAX_BATCH} commandes par lot` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      query = query.in("id", orderIds);
    } else {
      query = query.in("status", ["delivered", "manual_intervention", "awaiting_payment", "paid"]);
    }

    const { data: orders, error: fetchError } = await query;
    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let storedCount = 0;
    const storedOrderNumbers: string[] = [];
    const skipped: string[] = [];

    for (const order of orders || []) {
      if (!orderEligibleForCustomerInvoice(order) || orderHasStoredCustomerInvoice(order.documents)) {
        skipped.push(order.order_number as string);
        continue;
      }
      const result = await persistCustomerInvoiceIfMissing(auth.supabaseAdmin, order);
      if (result.stored) {
        storedCount += 1;
        storedOrderNumbers.push(order.order_number as string);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stored_count: storedCount,
      stored_order_numbers: storedOrderNumbers,
      skipped_count: skipped.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[admin-persist-customer-invoices]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
