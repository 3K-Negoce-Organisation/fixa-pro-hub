import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { generateCustomerInvoicePDF } from "../_shared/generate-customer-invoice-pdf.ts";
import { loadSiteLogoForOrderPdf } from "../_shared/site-logo.ts";
import { verifyGuestOrderTrackingToken } from "../_shared/guest-order-tracking-token.ts";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";
import { getCustomerVisibleStatus } from "../_shared/customer-visible-status.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_SLUG = Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function resolveOrderAccess(
  admin: ReturnType<typeof createClient>,
  orderNumber: string,
  email: string | null,
  userId: string | null,
  trackingToken: string | null,
) {
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (orderErr) throw orderErr;
  if (!order) return { error: "Commande introuvable.", status: 404 as const };

  if (userId) {
    if (order.user_id !== userId) {
      return { error: "Commande introuvable.", status: 404 as const };
    }
    return { order };
  }

  const orderEmail = (order.user_email as string | null)?.trim().toLowerCase() ?? "";
  const guestEmail = (email ?? "").trim().toLowerCase();
  if (!guestEmail || orderEmail !== guestEmail) {
    return { error: "Commande introuvable.", status: 404 as const };
  }

  const tokenOk = await verifyGuestOrderTrackingToken(orderNumber, guestEmail, trackingToken);
  if (!tokenOk) {
    return { error: "Lien de suivi invalide. Utilisez le lien reçu par email.", status: 403 as const };
  }

  return { order };
}

async function buildCustomerInvoiceResponse(
  admin: ReturnType<typeof createClient>,
  order: Record<string, unknown>,
) {
  const visibleStatus = getCustomerVisibleStatus({
    status: order.status as string,
    status_before_intervention: order.status_before_intervention as string | null,
  });
  if (visibleStatus !== "delivered") {
    return {
      error: "La facture client est disponible après livraison.",
      status: 403 as const,
    };
  }

  const { data: orderItems, error: itemsErr } = await admin
    .from("order_items")
    .select("product_title, variant_title, quantity, unit_price_ht, box_quantity")
    .eq("order_id", order.id as string);

  if (itemsErr) throw itemsErr;

  const siteLogo = await loadSiteLogoForOrderPdf(admin, order.site_id as string | null);
  const shippingCityLine = [order.shipping_postal_code, order.shipping_city]
    .filter(Boolean)
    .join(" ");

  const pdfBase64 = generateCustomerInvoicePDF({
    orderNumber: order.order_number as string,
    orderDate: formatOrderDate(order.created_at as string),
    customerName: null,
    shippingAddress: order.shipping_address as string | null,
    shippingCityLine: shippingCityLine || null,
    items: (orderItems ?? []).map((item) => ({
      product_title: item.product_title as string,
      variant_title: item.variant_title as string | null,
      quantity: item.quantity as number,
      unit_price_ht: Number(item.unit_price_ht),
      box_quantity: (item.box_quantity as number | null) ?? null,
    })),
    totalHT: Number(order.total_ht),
    totalTTC: Number(order.total_ttc),
    siteLogo,
  });

  const filename = `FACTURE_CLIENT_${order.order_number}.pdf`;

  return { pdfBase64, filename };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { order_number?: string; email?: string; token?: string };
    const order_number = (body.order_number ?? "").trim().toUpperCase();

    if (!order_number) {
      return new Response(JSON.stringify({ error: "Numéro de commande requis." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const adminAuth = await verifyAdminRequest(req);
    let order: Record<string, unknown> | null = null;

    if (adminAuth.ok) {
      const { data: adminOrder, error: adminOrderErr } = await adminAuth.supabaseAdmin
        .from("orders")
        .select("*")
        .eq("order_number", order_number)
        .maybeSingle();
      if (adminOrderErr) throw adminOrderErr;
      if (!adminOrder) {
        return new Response(JSON.stringify({ error: "Commande introuvable." }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      order = adminOrder;
    } else {
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

      let userId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "");
        const token = authHeader.replace("Bearer ", "");
        const { data: authData } = await anon.auth.getUser(token);
        userId = authData.user?.id ?? null;
      }

      const access = await resolveOrderAccess(
        admin,
        order_number,
        body.email ?? null,
        userId,
        body.token ?? null,
      );
      if ("error" in access) {
        return new Response(JSON.stringify({ error: access.error }), {
          status: access.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      order = access.order;
    }

    const invoice = await buildCustomerInvoiceResponse(admin, order);
    if ("error" in invoice) {
      return new Response(JSON.stringify({ error: invoice.error }), {
        status: invoice.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ pdf_base64: invoice.pdfBase64, filename: invoice.filename }), {
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
