import { splitOrderTotals } from "./order-totals.ts";
import { loadShippingConfigForSite } from "./shipping-config.ts";
import { sendOrderConfirmationEmail } from "./send-order-confirmation-email.ts";
import {
  createSupabaseConfirmationPort,
  deliverOrderConfirmation,
} from "./order-confirmation-delivery.ts";
import { enrichItemsWithAlsafixCodes } from "./alsafix-code.ts";
import { roundMoney } from "./money.ts";
import { generateOrderPDF } from "./generate-order-pdf.ts";
import { loadSupplierDocumentLogo } from "./site-logo.ts";
import { resolveOrderCustomerPhone } from "./order-customer-phone.ts";
import { resolveOrderCustomerEmail } from "./order-customer-email.ts";
import { buildOrderTrackingUrlForEmail } from "./guest-order-tracking-url.ts";
import { resolveSiteLogoUrlForEmail } from "./site-logo.ts";
import { tryClaimSupplierFulfillment } from "./order-fulfillment-claim.ts";
import { supplierPoContactEmail } from "./supplier-contact-email.ts";
import {
  resolveSiteSlug,
  resolveStorefrontUrlForSiteId,
  storefrontHostForSlug,
} from "./storefront-url.ts";

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

    const siteSlug = await resolveSiteSlug(supabaseAdmin, orderSiteId);
    const storefrontBase = await resolveStorefrontUrlForSiteId(supabaseAdmin, orderSiteId);
    const customerEmailForLink = resolvedEmail || customerEmail || "";
    const trackingUrl = customerEmailForLink
      ? await buildOrderTrackingUrlForEmail(orderNumber, customerEmailForLink, storefrontBase)
      : `${storefrontBase}/suivi`;
    const { productsHT, shippingHT } = splitOrderTotals(
      enrichedCartItems,
      totalHT,
      totalTTC,
      await loadShippingConfigForSite(supabaseAdmin, orderSiteId),
    );

    let pdfBase64: string | null = null;
    let pdfError: string | null = null;
    try {
      const carrierContactEmail = supplierPoContactEmail(supplierSettings);
      const siteLogo = loadSupplierDocumentLogo();
      pdfBase64 = generateOrderPDF(
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
        carrierContactEmail || null,
      );
    } catch (error) {
      pdfError = error instanceof Error ? error.message : String(error);
      console.error("[n8n-fulfill-order] PDF fournisseur en échec, e-mail client envoyé quand même", {
        orderNumber,
        orderId,
        error: pdfError,
      });
    }

    const shippingName = shippingAddress?.name || customerName;
    const shippingLine = [shippingAddress?.line1, shippingAddress?.line2].filter(Boolean).join(", ") || null;
    const shippingCityLine = shippingAddress?.postal_code && shippingAddress?.city
      ? `${shippingAddress.postal_code} ${shippingAddress.city}`
      : shippingAddress?.city || null;
    const logoUrl = await resolveSiteLogoUrlForEmail(supabaseAdmin, orderSiteId);
    const emailItems = enrichedCartItems.map((item) => ({
      title: (item.title || item.product_title || "") as string,
      variantTitle: (item.variantTitle || item.variant_title || null) as string | null,
      quantity: (item.quantity || item.q || 1) as number,
      unit_price_ht: roundMoney(Number(item.priceHT || item.unit_price_ht || 0)),
      boxQuantity: (item.box_quantity ?? item.boxQuantity ?? null) as number | null,
    }));

    const confirmation = await deliverOrderConfirmation(
      createSupabaseConfirmationPort(supabaseAdmin),
      {
        orderId,
        orderNumber,
        siteSlug,
        customerEmail: resolvedEmail || customerEmail,
        settings: supplierSettings,
        send: (input) => sendOrderConfirmationEmail({
          customerEmail: (resolvedEmail || customerEmail || "").trim(),
          fromEmail: input.fromEmail,
          fromName: input.fromName,
          replyTo: input.replyTo,
          idempotencyKey: input.idempotencyKey,
          logoUrl,
          storefrontHost: storefrontHostForSlug(siteSlug),
          bccEmail: supplierSettings?.status_email || null,
          orderNumber,
          items: emailItems,
          productsHT,
          shippingHT,
          totalHT,
          totalTTC,
          shippingName,
          shippingAddress: shippingLine,
          shippingCityLine,
          trackingUrl,
        }),
      },
      { pdfError },
    );
    if (confirmation.outcome === "failed") {
      console.error("[n8n-fulfill-order] confirmation client non envoyée", {
        orderNumber,
        orderId,
        error: confirmation.error,
      });
    }

    const supplierPurchaseTotal = enrichedCartItems.reduce((sum, item) => {
      const line = Number(
        item.purchase_line_total ?? item.product_purchase_price_ht ?? item.purchase_price_ht ?? 0,
      );
      return sum + (Number.isFinite(line) ? line : 0);
    }, 0);

    if (!n8nWebhookUrl) {
      console.error("[n8n-fulfill-order] N8N_WEBHOOK_URL absente, bon de commande n8n non envoyé", {
        orderNumber,
        orderId,
      });
      return;
    }
    if (enrichedCartItems.length === 0) {
      console.error("[n8n-fulfill-order] refuse empty supplier PO", { orderNumber, orderId });
      return;
    }
    if (!(supplierPurchaseTotal > 0)) {
      console.error("[n8n-fulfill-order] refuse zero-amount supplier PO", {
        orderNumber,
        orderId,
        lines: enrichedCartItems.length,
        supplierPurchaseTotal,
      });
      return;
    }
    if (!pdfBase64) {
      console.error("[n8n-fulfill-order] PDF absent, n8n non appelé", { orderNumber, orderId });
      return;
    }

    const claimed = await tryClaimSupplierFulfillment(supabaseAdmin, orderId);
    if (!claimed) {
      console.log("[n8n-fulfill-order] supplier fulfillment already claimed, skipping duplicate n8n", {
        orderNumber,
      });
      return;
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
        .upload(filePath, bytes, { contentType: "application/pdf", upsert: true, cacheControl: "0" });

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
      } else {
        console.error("[n8n-fulfill-order] upload PDF impossible", {
          orderNumber,
          orderId,
          error: uploadError.message,
        });
      }
    } catch (error) {
      console.error("[n8n-fulfill-order] stockage PDF impossible", {
        orderNumber,
        orderId,
        error: error instanceof Error ? error.message : String(error),
      });
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

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });
    if (!n8nResponse.ok) {
      console.error("[n8n-fulfill-order] n8n a répondu en erreur", {
        orderNumber,
        orderId,
        status: n8nResponse.status,
      });
    }
  } catch (error) {
    console.error("[n8n-fulfill-order] échec non bloquant pour le webhook", {
      orderNumber,
      orderId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
