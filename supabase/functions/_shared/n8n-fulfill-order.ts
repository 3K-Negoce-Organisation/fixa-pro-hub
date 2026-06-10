import { splitOrderTotals } from "./order-totals.ts";
import { sendOrderConfirmationEmail } from "./send-order-confirmation-email.ts";
import { enrichItemsWithAlsafixCodes } from "./alsafix-code.ts";
import { roundMoney } from "./money.ts";
import { generateOrderPDF } from "./generate-order-pdf.ts";
import { loadSiteLogoForOrderPdf } from "./site-logo.ts";
import { resolveOrderCustomerPhone } from "./order-customer-phone.ts";
import { resolveOrderCustomerEmail } from "./order-customer-email.ts";
import { buildOrderTrackingUrlForEmail } from "./guest-order-tracking-url.ts";
import { resolveResendFrom } from "./resolve-resend-from.ts";
import { resolveSiteLogoUrlForEmail } from "./site-logo.ts";

export type SendOrderToN8nParams = {
  n8nWebhookUrl: string;
  supabaseAdmin: {
    from: (table: string) => ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.57.2").createClient>["from"];
    storage: ReturnType<typeof import("https://esm.sh/@supabase/supabase-js@2.57.2").createClient>["storage"];
  };
  orderNumber: string;
  orderId: string;
  stripeId: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  shippingAddress: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    postal_code?: string | null;
    name?: string | null;
  } | null;
  cartItems: Array<Record<string, unknown>>;
  totalHT: number;
  totalTTC: number;
};

export async function sendOrderToN8n(params: SendOrderToN8nParams): Promise<void> {
  const {
    n8nWebhookUrl,
    supabaseAdmin,
    orderNumber,
    orderId,
    stripeId,
    customerName,
    customerEmail,
    customerPhone,
    shippingAddress,
    cartItems,
    totalHT,
    totalTTC,
  } = params;

  try {
    const { data: supplierSettings } = await supabaseAdmin
      .from("supplier_settings")
      .select("*")
      .maybeSingle();

    const customerNumber = supplierSettings?.customer_number || "000001";
    const enrichedCartItems = await enrichItemsWithAlsafixCodes(supabaseAdmin, cartItems);

    let resolvedPhone = customerPhone?.trim() || null;
    let resolvedEmail = customerEmail?.trim() || "";
    let orderSiteId: string | null = null;

    if (orderId) {
      const { data: orderRow } = await supabaseAdmin
        .from("orders")
        .select("user_id, site_id, notes, user_email")
        .eq("id", orderId)
        .maybeSingle();
      orderSiteId = orderRow?.site_id ?? null;
      if (orderRow) {
        if (!resolvedPhone) {
          resolvedPhone = await resolveOrderCustomerPhone(supabaseAdmin, orderRow);
        }
        if (!resolvedEmail) {
          resolvedEmail = await resolveOrderCustomerEmail(supabaseAdmin, orderRow, customerEmail);
        }
      }
    }

    const siteLogo = await loadSiteLogoForOrderPdf(supabaseAdmin, orderSiteId);
    const pdfBase64 = generateOrderPDF(
      orderNumber,
      customerName || "",
      resolvedEmail,
      customerNumber,
      enrichedCartItems,
      shippingAddress
        ? {
          name: shippingAddress.name || customerName || undefined,
          line1: shippingAddress.line1 || undefined,
          line2: shippingAddress.line2 || undefined,
          city: shippingAddress.city || undefined,
          postal_code: shippingAddress.postal_code || undefined,
        }
        : null,
      resolvedPhone,
      siteLogo,
    );

    const { productsHT, shippingHT } = splitOrderTotals(enrichedCartItems, totalHT);
    const fromEmail = supplierSettings?.customer_service_email || supplierSettings?.email;
    const storefrontBase = (Deno.env.get("STOREFRONT_URL") || "https://www.vis-a-bois.com").replace(/\/$/, "");
    const customerEmailForLink = resolvedEmail || customerEmail || "";
    const trackingUrl = customerEmailForLink
      ? buildOrderTrackingUrlForEmail(orderNumber, customerEmailForLink, storefrontBase)
      : `${storefrontBase}/suivi?order=${encodeURIComponent(orderNumber)}`;

    if ((fromEmail || Deno.env.get("RESEND_FROM_EMAIL")) && (resolvedEmail || customerEmail)) {
      const shippingName = shippingAddress?.name || customerName;
      const shippingLine = [shippingAddress?.line1, shippingAddress?.line2].filter(Boolean).join(", ") || null;
      const shippingCityLine = shippingAddress?.postal_code && shippingAddress?.city
        ? `${shippingAddress.postal_code} ${shippingAddress.city}`
        : shippingAddress?.city || null;

      const { fromEmail: resendFrom, fromName, replyTo } = resolveResendFrom(supplierSettings);
      const logoUrl = await resolveSiteLogoUrlForEmail(supabaseAdmin, orderSiteId);

      await sendOrderConfirmationEmail({
        customerEmail: resolvedEmail || customerEmail!,
        fromEmail: resendFrom,
        fromName,
        replyTo,
        logoUrl,
        bccEmail: supplierSettings?.status_email || null,
        orderNumber,
        items: enrichedCartItems.map((item) => ({
          title: (item.title || item.product_title || "") as string,
          variantTitle: (item.variantTitle || item.variant_title || null) as string | null,
          quantity: (item.quantity || item.q || 1) as number,
          unit_price_ht: roundMoney(Number(item.priceHT || item.unit_price_ht || 0)),
          boxQuantity: (item.box_quantity ?? item.boxQuantity ?? null) as number | null,
        })),
        productsHT,
        shippingHT,
        totalHT,
        totalTTC,
        shippingName,
        shippingAddress: shippingLine,
        shippingCityLine,
        trackingUrl,
      });
    }

    const pdfFileName = `commande_${orderNumber}.pdf`;
    const filePath = `${orderId}/${pdfFileName}`;

    try {
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from("order-documents")
        .upload(filePath, bytes, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: signedUrlData } = await supabaseAdmin.storage
          .from("order-documents")
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        if (signedUrlData?.signedUrl) {
          const newDocument = {
            name: pdfFileName,
            type: "order_confirmation",
            url: signedUrlData.signedUrl,
            created_at: new Date().toISOString(),
            status: "paid",
          };

          const { data: currentOrder } = await supabaseAdmin
            .from("orders")
            .select("documents")
            .eq("id", orderId)
            .single();

          const existingDocuments = currentOrder?.documents || [];
          await supabaseAdmin
            .from("orders")
            .update({ documents: [...existingDocuments, newDocument] })
            .eq("id", orderId);
        }
      }
    } catch {
      // non-blocking storage errors
    }

    const n8nPayload = {
      event: "order.paid",
      order_number: orderNumber,
      order_id: orderId,
      stripe_id: stripeId,
      customer: {
        email: resolvedEmail || customerEmail,
        phone: resolvedPhone || customerPhone,
        name: customerName,
        shipping_address: shippingAddress,
      },
      supplier: supplierSettings
        ? {
          name: supplierSettings.name || null,
          email: supplierSettings.email || null,
          status_email: supplierSettings.status_email || null,
          address: supplierSettings.address || null,
          postal_code: supplierSettings.postal_code || null,
          city: supplierSettings.city || null,
          phone: supplierSettings.phone || null,
        }
        : null,
      items: enrichedCartItems.map((item) => ({
        product_id: item.id || item.product_id,
        code_alsafix: item.code_alsafix || "",
        variant_id: item.variantId || item.id,
        title: item.title || item.product_title,
        variant_title: item.variantTitle || "Default",
        quantity: item.quantity || item.q || 1,
        unit_price_ht: roundMoney(Number(item.priceHT || item.unit_price_ht || 0)),
        unit_price_ttc: roundMoney(
          Number(item.priceTTC ?? (Number(item.priceHT || item.unit_price_ht || 0) * 1.2)),
        ),
      })),
      totals: {
        ht: totalHT,
        ttc: totalTTC,
        products_ht: productsHT,
        shipping_ht: shippingHT,
        currency: "EUR",
      },
      pdf_file: {
        filename: pdfFileName,
        content_base64: pdfBase64,
        content_type: "application/pdf",
      },
      created_at: new Date().toISOString(),
    };

    await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });
  } catch (error) {
    console.error("[n8n-fulfill-order] failed (non-blocking):", error);
  }
}
