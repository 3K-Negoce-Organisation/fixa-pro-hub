import type { jsPDF } from "https://esm.sh/jspdf@2.5.1";

/** Raison sociale émettrice des documents commande / facture (override via MERCHANT_LEGAL_NAME). */
export const MERCHANT_LEGAL_NAME = (Deno.env.get("MERCHANT_LEGAL_NAME") || "3K-Négoce").trim();

const MERCHANT_ADDRESS = "SAS — 47 rue Vivienne, 75002 Paris";
const MERCHANT_IDS = "SIREN 102 662 483 — TVA FR45102662483";

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
