import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { verifyAdminRequest, isServiceRoleBearer } from "../_shared/verify-admin.ts";
import {
  orderEligibleForCustomerInvoice,
  orderHasStoredCustomerInvoice,
  persistCustomerInvoice,
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
    const isInternal = isServiceRoleBearer(authHeader);

    const auth = isInternal
      ? { ok: true as const, supabaseAdmin: createClient(supabaseUrl, serviceKey || authHeader!.replace(/^Bearer\s+/i, "")) }
      : await verifyAdminRequest(req);

    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const orderIds = Array.isArray(body.order_ids) ? body.order_ids as string[] : [];
    const forceRegenerate = body.force_regenerate === true;
    const sendEmail = body.send_email === true;

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
    let emailedCount = 0;
    const storedOrderNumbers: string[] = [];
    const emailedOrderNumbers: string[] = [];
    const skipped: string[] = [];
    const errors: Array<{ order_number: string; error: string }> = [];

    for (const order of orders || []) {
      if (!orderEligibleForCustomerInvoice(order)) {
        skipped.push(order.order_number as string);
        continue;
      }

      if (!forceRegenerate && orderHasStoredCustomerInvoice(order.documents)) {
        skipped.push(order.order_number as string);
        continue;
      }

      try {
        const result = await persistCustomerInvoice(auth.supabaseAdmin, order, {
          forceRegenerate,
          sendEmail,
        });
        if (result.stored) {
          storedCount += 1;
          storedOrderNumbers.push(order.order_number as string);
        }
        if (result.emailed) {
          emailedCount += 1;
          emailedOrderNumbers.push(order.order_number as string);
        } else if (sendEmail && result.stored && result.emailError) {
          errors.push({
            order_number: order.order_number as string,
            error: result.emailError,
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push({ order_number: order.order_number as string, error: message });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stored_count: storedCount,
      stored_order_numbers: storedOrderNumbers,
      emailed_count: emailedCount,
      emailed_order_numbers: emailedOrderNumbers,
      skipped_count: skipped.length,
      errors,
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
