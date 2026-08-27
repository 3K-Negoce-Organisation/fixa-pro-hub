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

type OrderStatusEventRef = {
  status: string;
  event_kind: string;
  created_at: string;
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

function getDocumentUploadedAt(order: Record<string, unknown>, type: string): string | null {
  const documents = Array.isArray(order.documents) ? order.documents as OrderDocumentRef[] : [];
  const doc = documents.find((entry) => String(entry.type || "").toUpperCase() === type);
  return doc?.uploaded_at ?? null;
}

/**
 * Date de livraison : événement `delivered`, sinon facture fournisseur (FACTURE),
 * sinon expédition (BL / statut shipped).
 */
export function resolveOrderDeliveryDateIso(
  order: Record<string, unknown>,
  events: OrderStatusEventRef[] = [],
): string | null {
  const deliveredEvents = events.filter((event) => event.status === "delivered");
  if (deliveredEvents.length > 0) {
    return deliveredEvents[deliveredEvents.length - 1].created_at;
  }

  const supplierInvoiceAt = getSupplierInvoiceIssuedAt(order);
  if (supplierInvoiceAt) return supplierInvoiceAt;

  const shippedEvents = events.filter((event) => event.status === "shipped");
  if (shippedEvents.length > 0) {
    return shippedEvents[shippedEvents.length - 1].created_at;
  }

  return getDocumentUploadedAt(order, "BL");
}

/** Date d'encaissement : événement Stripe / paiement reçu, sinon date de commande si payée. */
export function resolveOrderPaymentDateIso(
  order: Record<string, unknown>,
  events: OrderStatusEventRef[] = [],
): string | null {
  const paymentEvent = events.find(
    (event) => event.event_kind === "payment_received" || event.event_kind === "auto_stripe",
  );
  if (paymentEvent?.created_at) return paymentEvent.created_at;

  const status = String(order.status || "").toLowerCase();
  if (status !== "pending" && status !== "cancelled" && status !== "awaiting_payment") {
    const createdAt = String(order.created_at || "").trim();
    return createdAt || null;
  }

  return null;
}

async function loadOrderStatusEvents(
  admin: SupabaseClient,
  orderId: string,
): Promise<OrderStatusEventRef[]> {
  const { data, error } = await admin
    .from("order_status_events")
    .select("status, event_kind, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as OrderStatusEventRef[];
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

  const statusEvents = await loadOrderStatusEvents(admin, order.id as string);
  const deliveryDateIso = resolveOrderDeliveryDateIso(order, statusEvents);
  const paymentDateIso = resolveOrderPaymentDateIso(order, statusEvents);

  const siteLogo = await loadSiteLogoForOrderPdf(admin, order.site_id as string | null);
  const shippingCityLine = [order.shipping_postal_code, order.shipping_city]
    .filter(Boolean)
    .join(" ");

  return {
    invoiceNumber,
    invoiceDate: formatInvoiceDateFr(invoiceDateIso),
    deliveryDate: deliveryDateIso ? formatInvoiceDateFr(deliveryDateIso) : null,
    paidDate: paymentDateIso ? formatInvoiceDateFr(paymentDateIso) : null,
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
