import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { buildCustomerInvoicePdfBase64 } from "./customer-invoice-from-order.ts";
import { getCustomerVisibleStatus } from "./customer-visible-status.ts";
import { resolveResendFrom } from "./resolve-resend-from.ts";
import { sendCustomerInvoiceEmail } from "./send-customer-invoice-email.ts";

export interface OrderDocumentEntry {
  name: string;
  path?: string;
  url?: string;
  type: string;
  uploaded_at: string;
  source?: string;
}

export interface PersistCustomerInvoiceOptions {
  forceRegenerate?: boolean;
  sendEmail?: boolean;
}

export interface PersistCustomerInvoiceResult {
  stored: boolean;
  regenerated?: boolean;
  emailed?: boolean;
  document?: OrderDocumentEntry;
  invoiceNumber?: string;
  emailError?: string;
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

async function loadSupplierSettings(
  admin: SupabaseClient,
  siteId: string | null | undefined,
) {
  if (!siteId) return null;
  const { data } = await admin
    .from("supplier_settings")
    .select("name, customer_service_email, email")
    .eq("site_id", siteId)
    .maybeSingle();
  return data;
}

async function maybeSendCustomerInvoiceEmail(
  admin: SupabaseClient,
  order: Record<string, unknown>,
  pdfBase64: string,
  displayName: string,
  invoiceNumber: string,
): Promise<{ emailed: boolean; emailError?: string }> {
  const customerEmail = String(order.user_email || "").trim();
  if (!customerEmail) {
    return { emailed: false, emailError: "user_email manquant" };
  }

  const supplierSettings = await loadSupplierSettings(admin, order.site_id as string | null);
  const { fromEmail, fromName, replyTo } = resolveResendFrom(supplierSettings ?? undefined);

  const result = await sendCustomerInvoiceEmail({
    customerEmail,
    fromEmail,
    fromName,
    replyTo,
    orderNumber: order.order_number as string,
    invoiceNumber,
    customerName: order.shipping_name as string | null,
    pdfBase64,
    filename: displayName,
  });

  return { emailed: result.sent, emailError: result.error };
}

export async function persistCustomerInvoice(
  admin: SupabaseClient,
  order: Record<string, unknown>,
  options: PersistCustomerInvoiceOptions = {},
): Promise<PersistCustomerInvoiceResult> {
  const { forceRegenerate = false, sendEmail = false } = options;

  if (!orderEligibleForCustomerInvoice(order)) {
    return { stored: false };
  }

  const documents = Array.isArray(order.documents) ? order.documents as OrderDocumentEntry[] : [];
  const hasStored = orderHasStoredCustomerInvoice(documents);

  if (hasStored && !forceRegenerate) {
    return { stored: false };
  }

  if (hasStored && forceRegenerate) {
    await invalidateStoredCustomerInvoice(admin, order);
    order = { ...order, documents: filterOutCustomerInvoices(documents).kept };
  }

  const orderNumber = String(order.order_number || "").trim().toUpperCase();
  if (!orderNumber) return { stored: false };

  const pdfBase64 = await buildCustomerInvoicePdfBase64(admin, order);

  const { data: refreshedOrder } = await admin
    .from("orders")
    .select("customer_invoice_number")
    .eq("id", order.id as string)
    .maybeSingle();

  const invoiceNumber = String(
    refreshedOrder?.customer_invoice_number || order.customer_invoice_number || "",
  ).trim();

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

  const currentDocs = Array.isArray(order.documents) ? order.documents as OrderDocumentEntry[] : [];
  const { error: updateError } = await admin
    .from("orders")
    .update({
      documents: [...currentDocs, documentEntry],
      updated_at: new Date().toISOString(),
    })
    .eq("id", order.id as string);

  if (updateError) {
    throw new Error(updateError.message);
  }

  let emailed = false;
  let emailError: string | undefined;
  if (sendEmail) {
    const emailResult = await maybeSendCustomerInvoiceEmail(
      admin,
      order,
      pdfBase64,
      displayName,
      invoiceNumber,
    );
    emailed = emailResult.emailed;
    emailError = emailResult.emailError;
  }

  return {
    stored: true,
    regenerated: forceRegenerate && hasStored,
    emailed,
    document: documentEntry,
    invoiceNumber,
    emailError,
  };
}

export async function persistCustomerInvoiceIfMissing(
  admin: SupabaseClient,
  order: Record<string, unknown>,
  options: Omit<PersistCustomerInvoiceOptions, "forceRegenerate"> = {},
): Promise<PersistCustomerInvoiceResult> {
  return persistCustomerInvoice(admin, order, { ...options, forceRegenerate: false });
}
