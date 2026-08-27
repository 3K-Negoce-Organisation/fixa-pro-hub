import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { enrichItemsWithAlsafixCodes } from "../_shared/alsafix-code.ts";
import { generateOrderPDF } from "../_shared/generate-order-pdf.ts";
import { resolveUniteDeVente } from "../_shared/order-supplier-quantity.ts";
import { loadSupplierDocumentLogo } from "../_shared/site-logo.ts";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[PREVIEW-SUPPLIER-PDF] ${step}${detailsStr}`);
};

function generateSimulationOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SIM-${year}${month}-${random}`;
}

type SimulationCartItem = {
  product_id: string;
  quantity: number;
  variant_id?: string;
  variant_title?: string;
  product_title?: string;
};

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

    const body = await req.json();
    const items = (body.items || []) as SimulationCartItem[];
    const includePdf = body.include_pdf !== false;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: "Au moins un produit est requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const item of items) {
      if (!item.product_id || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) {
        return new Response(JSON.stringify({ error: "Chaque ligne doit avoir un product_id et une quantité > 0" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const orderNumber = String(body.order_number || "").trim() || generateSimulationOrderNumber();
    const siteId = body.site_id?.trim() || null;
    const customer = body.customer || {};
    const shipping = body.shipping || {};

    const orderItems = items.map((item) => ({
      product_id: item.product_id,
      product_title: item.product_title || "Produit",
      quantity: Number(item.quantity),
      variant_title: item.variant_title || "Default",
      variant_id: item.variant_id || item.product_id,
    }));

    logStep("Simulation cart", { lines: orderItems.length, orderNumber, siteId });

    const enrichedItems = await enrichItemsWithAlsafixCodes(auth.supabaseAdmin, orderItems);

    const { data: supplierSettings } = await auth.supabaseAdmin
      .from("supplier_settings")
      .select("*")
      .maybeSingle();

    const customerNumber = supplierSettings?.customer_number || "000001";
    const displayName = String(customer.name || "Simulation admin").trim();
    const customerEmail = String(customer.email || "simulation@admin.local").trim();
    const customerPhone = customer.phone?.trim() || null;
    const carrierContactEmail = String(
      supplierSettings?.customer_service_email || supplierSettings?.email || "",
    ).trim() || null;

    const lineBreakdown = enrichedItems.map((item) => {
      const productUniteDeVente =
        (item.product_unite_de_vente ?? item.unite_de_vente) as number | null | undefined;
      const uniteDeVente = resolveUniteDeVente(item, productUniteDeVente);

      return {
        code_alsafix: item.code_alsafix || "",
        product_title: item.product_title || item.title || "",
        quantity: item.quantity,
        variant_id: item.variant_id,
        variant_title: item.variant_title,
        box_quantity: item.product_box_quantity ?? item.box_quantity ?? null,
        purchase_price_ht: item.product_purchase_price_ht ?? item.purchase_price_ht ?? null,
        product_box_quantity: item.product_box_quantity ?? item.box_quantity ?? null,
        product_purchase_price_ht: item.product_purchase_price_ht ?? item.purchase_price_ht ?? null,
        unite_de_vente: productUniteDeVente ?? uniteDeVente,
        product_unite_de_vente: productUniteDeVente ?? uniteDeVente,
        is_kit: item.is_kit === true,
        is_accessory: item.is_accessory === true,
        is_single_uv_tariff: item.is_single_uv_tariff === true,
        element_quantity: item.element_quantity,
        tarif_uv: item.tarif_uv,
        purchase_line_total: item.purchase_line_total,
      };
    });

    const totalHt = lineBreakdown.reduce(
      (sum, line) => sum + Number(line.purchase_line_total || 0),
      0,
    );

    let pdfFile: { filename: string; content_base64: string; content_type: string } | null = null;

    if (includePdf) {
      const siteLogo = loadSupplierDocumentLogo();
      const pdfBase64 = generateOrderPDF(
        orderNumber,
        displayName,
        customerEmail,
        customerNumber,
        enrichedItems,
        {
          name: shipping.name || displayName || undefined,
          line1: shipping.line1 || undefined,
          line2: shipping.line2 || undefined,
          city: shipping.city || undefined,
          postal_code: shipping.postal_code || undefined,
        },
        customerPhone,
        siteLogo,
        carrierContactEmail,
      );

      pdfFile = {
        filename: `simulation_${orderNumber}.pdf`,
        content_base64: pdfBase64,
        content_type: "application/pdf",
      };

      logStep("PDF generated", { size: pdfBase64.length });
    }

    return new Response(
      JSON.stringify({
        preview: true,
        simulation: true,
        order_number: orderNumber,
        lines: lineBreakdown,
        totals: {
          ht: Math.round(totalHt * 100) / 100,
          ttc: Math.round(totalHt * 1.2 * 100) / 100,
        },
        pdf_file: pdfFile,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
