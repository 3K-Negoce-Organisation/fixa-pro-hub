import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function formatCustomerInvoiceNumber(sequence: number, date = new Date()): string {
  const year = date.getFullYear();
  return `FC-${year}-${String(sequence).padStart(5, "0")}`;
}

export async function nextCustomerInvoiceSequence(
  admin: SupabaseClient,
  siteId: string,
): Promise<number> {
  const { data, error } = await admin.rpc("next_site_customer_invoice_sequence", {
    p_site_id: siteId,
  });
  if (error) throw error;
  return data as number;
}
