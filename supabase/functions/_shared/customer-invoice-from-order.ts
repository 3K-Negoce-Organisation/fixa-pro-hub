import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  generateCustomerInvoicePDF,
  type CustomerInvoiceParams,
} from "./generate-customer-invoice-pdf.ts";
import {
  formatCustomerInvoiceNumber,
  isLegacyCustomerInvoiceNumber,
} from "./customer-invoice-number.ts";
import { loadSiteLogoForOrderPdf } from "./site-logo.ts";

type OrderDocumentRef = {
  type?: string;
  uploaded_at?: string;
};

export function formatInvoiceDateFr(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function getSupplierInvoiceIssuedAt(order: Record<string, unknown>): string | null {
  const documents = Array.isArray(order.documents) ? order.documents as OrderDocumentRef[] : [];
  const facture = documents.find((doc) => String(doc.type || "").toUpperCase() === "FACTURE");
  return facture?.uploaded_at ?? null;
}

export async function ensureCustomerInvoiceMetadata(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<{ invoiceNumber: string; invoiceDateIso: string }> {
  const orderId = order.id as string;
  const orderNumber = String(order.order_number || "").trim().toUpperCase();
  let invoiceNumber = String(order.customer_invoice_number || "").trim();
  let invoiceDateIso = String(order.customer_invoice_issued_at || "").trim();

  if (!invoiceDateIso) {
    invoiceDateIso = getSupplierInvoiceIssuedAt(order) ?? new Date().toISOString();
  }

  const needsNumber = !invoiceNumber || isLegacyCustomerInvoiceNumber(invoiceNumber);
  if (needsNumber) {
    if (!orderNumber) throw new Error("order_number manquant pour attribuer un numéro de facture");
    invoiceNumber = formatCustomerInvoiceNumber(orderNumber, 1);
    const { error } = await admin
      .from("orders")
      .update({
        customer_invoice_number: invoiceNumber,
        customer_invoice_issued_at: invoiceDateIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) throw error;
  } else if (!order.customer_invoice_issued_at) {
    const { error } = await admin
      .from("orders")
      .update({
        customer_invoice_issued_at: invoiceDateIso,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    if (error) throw error;
  }

  return { invoiceNumber, invoiceDateIso };
}

export async function buildCustomerInvoiceParams(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<CustomerInvoiceParams> {
  const { invoiceNumber, invoiceDateIso } = await ensureCustomerInvoiceMetadata(admin, order);

  const { data: orderItems, error: itemsErr } = await admin
    .from("order_items")
    .select("product_title, variant_title, quantity, unit_price_ht, unit_price_ttc, box_quantity")
    .eq("order_id", order.id as string);

  if (itemsErr) throw itemsErr;

  const siteLogo = await loadSiteLogoForOrderPdf(admin, order.site_id as string | null);
  const shippingCityLine = [order.shipping_postal_code, order.shipping_city]
    .filter(Boolean)
    .join(" ");

  return {
    invoiceNumber,
    invoiceDate: formatInvoiceDateFr(invoiceDateIso),
    orderNumber: order.order_number as string,
    customerName: (order.shipping_name as string | null) ?? null,
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
  };
}

export async function buildCustomerInvoicePdfBase64(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<string> {
  const params = await buildCustomerInvoiceParams(admin, order);
  return generateCustomerInvoicePDF(params);
}
