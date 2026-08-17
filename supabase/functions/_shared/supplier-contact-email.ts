/** Email affiché sur le BC fournisseur (contact livré au fournisseur). */
export function supplierPoContactEmail(
  settings: {
    customer_service_email?: string | null;
    email?: string | null;
  } | null | undefined,
): string {
  return String(settings?.customer_service_email || settings?.email || "").trim();
}
