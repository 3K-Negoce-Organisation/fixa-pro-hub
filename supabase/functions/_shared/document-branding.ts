import type { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import { CUSTOMER_INVOICE_SELLER } from "./customer-invoice-seller.ts";

/** Raison sociale émettrice des documents commande / facture (override via MERCHANT_LEGAL_NAME). */
export const MERCHANT_LEGAL_NAME = (Deno.env.get("MERCHANT_LEGAL_NAME") || CUSTOMER_INVOICE_SELLER.name).trim();

const MERCHANT_ADDRESS = `${CUSTOMER_INVOICE_SELLER.legalForm} — ${CUSTOMER_INVOICE_SELLER.addressLine1}, ${CUSTOMER_INVOICE_SELLER.postalCode} ${CUSTOMER_INVOICE_SELLER.city}`;
const MERCHANT_IDS = `SIREN ${CUSTOMER_INVOICE_SELLER.siren} — TVA ${CUSTOMER_INVOICE_SELLER.vatNumber}`;

/** Bloc émetteur en haut à droite des PDF (logo boutique à gauche). */
export function drawMerchantLegalBlock(
  doc: InstanceType<typeof jsPDF>,
  pageWidth: number,
  margin: number,
  startY = 10,
): void {
  const x = pageWidth - margin;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(MERCHANT_LEGAL_NAME, x, startY, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(MERCHANT_ADDRESS, x, startY + 4, { align: "right" });
  doc.text(MERCHANT_IDS, x, startY + 8, { align: "right" });
}
