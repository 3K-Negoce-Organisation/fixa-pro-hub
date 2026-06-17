import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { generateCustomerInvoicePDF } from "./generate-customer-invoice-pdf.ts";
import { loadSiteLogoForOrderPdf } from "./site-logo.ts";
import { getCustomerVisibleStatus } from "./customer-visible-status.ts";

export interface OrderDocumentEntry {
  name: string;
  path?: string;
  url?: string;
  type: string;
  uploaded_at: string;
  source?: string;
}

function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function orderHasStoredCustomerInvoice(
  documents: unknown,
): boolean {
  if (!Array.isArray(documents)) return false;
  return documents.some((doc) => {
    const entry = doc as OrderDocumentEntry;
    const type = String(entry.type || "").toUpperCase();
    return type === "FACTURE_CLIENT" && !!(entry.path || entry.url);
  });
}

export function orderEligibleForCustomerInvoice(order: Record<string, unknown>): boolean {
  const visibleStatus = getCustomerVisibleStatus({
    status: order.status as string,
    status_before_intervention: order.status_before_intervention as string | null,
  });
  return visibleStatus === "delivered";
}

function filterOutCustomerInvoices(documents: OrderDocumentEntry[]): {
  kept: OrderDocumentEntry[];
  removed: OrderDocumentEntry[];
} {
  const kept: OrderDocumentEntry[] = [];
  const removed: OrderDocumentEntry[] = [];
  for (const doc of documents) {
    const type = String(doc.type || "").toUpperCase();
    if (type === "FACTURE_CLIENT" && (doc.path || doc.url)) {
      removed.push(doc);
    } else {
      kept.push(doc);
    }
  }
  return { kept, removed };
}

/** Supprime la facture client stockée (Storage + entrée documents) pour forcer une régénération. */
export async function invalidateStoredCustomerInvoice(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<void> {
  const documents = Array.isArray(order.documents)
    ? (order.documents as OrderDocumentEntry[])
    : [];
  const { kept, removed } = filterOutCustomerInvoices(documents);
  if (removed.length === 0) return;

  const paths = removed.map((doc) => doc.path).filter((p): p is string => !!p);
  if (paths.length > 0) {
    const { error: storageErr } = await admin.storage.from("order-documents").remove(paths);
    if (storageErr) {
      console.warn("[invalidateStoredCustomerInvoice] storage remove:", storageErr.message);
    }
  }

  const { error: updateError } = await admin
    .from("orders")
    .update({
      documents: kept,
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id as string);

  if (updateError) throw new Error(updateError.message);
}

async function buildCustomerInvoicePdfBase64(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<string> {
  const { data: orderItems, error: itemsErr } = await admin
    .from("order_items")
    .select("product_title, variant_title, quantity, unit_price_ht, unit_price_ttc, box_quantity")
    .eq("order_id", order.id as string);

  if (itemsErr) throw itemsErr;

  const siteLogo = await loadSiteLogoForOrderPdf(admin, order.site_id as string | null);
  const shippingCityLine = [order.shipping_postal_code, order.shipping_city]
    .filter(Boolean)
    .join(" ");

  return generateCustomerInvoicePDF({
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
}

export async function persistCustomerInvoiceIfMissing(
  admin: SupabaseClient,
  order: Record<string, unknown>,
): Promise<{ stored: boolean; document?: OrderDocumentEntry }> {
  if (!orderEligibleForCustomerInvoice(order)) {
    return { stored: false };
  }

  const documents = Array.isArray(order.documents) ? order.documents as OrderDocumentEntry[] : [];
  if (orderHasStoredCustomerInvoice(documents)) {
    return { stored: false };
  }

  const orderNumber = String(order.order_number || "").trim().toUpperCase();
  if (!orderNumber) return { stored: false };

  const pdfBase64 = await buildCustomerInvoicePdfBase64(admin, order);
  const binaryString = atob(pdfBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const displayName = `FACTURE_CLIENT_${orderNumber}.pdf`;
  const storagePath = `${orderNumber}/${displayName}`;

  const { error: uploadError } = await admin.storage
    .from("order-documents")
    .upload(storagePath, bytes.buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = admin.storage
    .from("order-documents")
    .getPublicUrl(storagePath);

  const documentEntry: OrderDocumentEntry = {
    name: displayName,
    path: storagePath,
    url: publicUrlData.publicUrl,
    type: "FACTURE_CLIENT",
    uploaded_at: new Date().toISOString(),
    source: "system",
  };

  const { error: updateError } = await admin
    .from("orders")
    .update({
      documents: [...documents, documentEntry],
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id as string);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return { stored: true, document: documentEntry };
}
