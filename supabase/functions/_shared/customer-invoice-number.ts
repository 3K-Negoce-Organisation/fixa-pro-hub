/** FACTURE-VIS-202606-OOVA6L-001 */
export function formatCustomerInvoiceNumber(orderNumber: string, sequence = 1): string {
  const safeOrder = orderNumber.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "-").replace(/-+/g, "-");
  return `FACTURE-${safeOrder}-${String(sequence).padStart(3, "0")}`;
}

export function isLegacyCustomerInvoiceNumber(num: string): boolean {
  return /^FC-\d{4}-/i.test(num.trim());
}
