import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { generateCustomerInvoicePDF } from "../_shared/generate-customer-invoice-pdf.ts";
import { loadSiteLogoForOrderPdf } from "../_shared/site-logo.ts";

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

  return { order };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { order_number?: string; email?: string };
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

    const access = await resolveOrderAccess(admin, order_number, body.email ?? null, userId);
    if ("error" in access) {
      return new Response(JSON.stringify({ error: access.error }), {
        status: access.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = access.order;
    const blockedStatuses = new Set(["pending", "cancelled"]);
    if (blockedStatuses.has(order.status as string)) {
      return new Response(JSON.stringify({ error: "Facture indisponible pour cette commande." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: orderItems, error: itemsErr } = await admin
      .from("order_items")
      .select("product_id, product_title, variant_title, quantity, unit_price_ht")
      .eq("order_id", order.id);

    if (itemsErr) throw itemsErr;

    const productIds = [...new Set((orderItems ?? []).map((item) => item.product_id as string).filter(Boolean))];
    const boxByProductId = new Map<string, number | null>();
    if (productIds.length > 0) {
      const { data: products } = await admin
        .from("products")
        .select("id, box_quantity")
        .in("id", productIds);
      for (const product of products ?? []) {
        boxByProductId.set(product.id as string, product.box_quantity as number | null);
      }
    }

    const siteLogo = await loadSiteLogoForOrderPdf(admin, order.site_id as string | null);
    const shippingCityLine = [order.shipping_postal_code, order.shipping_city]
      .filter(Boolean)
      .join(" ");

    const pdfBase64 = generateCustomerInvoicePDF({
      orderNumber: order.order_number,
      orderDate: formatOrderDate(order.created_at as string),
      customerName: null,
      shippingAddress: order.shipping_address as string | null,
      shippingCityLine: shippingCityLine || null,
      items: (orderItems ?? []).map((item) => ({
        product_title: item.product_title as string,
        variant_title: item.variant_title as string | null,
        quantity: item.quantity as number,
        unit_price_ht: Number(item.unit_price_ht),
        box_quantity: boxByProductId.get(item.product_id as string) ?? null,
      })),
      totalHT: Number(order.total_ht),
      totalTTC: Number(order.total_ttc),
      siteLogo,
    });

    const filename = `facture_${order.order_number}.pdf`;

    return new Response(JSON.stringify({ pdf_base64: pdfBase64, filename }), {
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
