import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { getBoxQuantityLabel } from "./box-quantity.ts";
import { normalizeInvoiceLineItems } from "./order-totals.ts";
import { roundMoney } from "./money.ts";
import { getDisplayVariantTitle } from "./variant-title.ts";
import type { PdfSiteLogo } from "./site-logo.ts";
import {
  CUSTOMER_INVOICE_LEGAL_LINES,
  CUSTOMER_INVOICE_SELLER,
} from "./customer-invoice-seller.ts";

const LOGO_MAX_WIDTH_MM = 40;
const LOGO_MAX_HEIGHT_MM = 12;

function formatMoneyFr(value: number): string {
  const rounded = roundMoney(value);
  const [intPart, decPart = "00"] = rounded.toFixed(2).split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${withSpaces},${decPart}`;
}

function drawSiteLogo(
  doc: InstanceType<typeof jsPDF>,
  margin: number,
  siteLogo?: PdfSiteLogo | null,
): number {
  const defaultBottom = 8;
  try {
    if (!siteLogo?.dataUrl || !siteLogo.format) return defaultBottom;

    const sourceWidth = Number(siteLogo.width);
    const sourceHeight = Number(siteLogo.height);
    if (!Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight) || sourceWidth <= 0 || sourceHeight <= 0) {
      return defaultBottom;
    }

    const ratio = sourceWidth / sourceHeight;
    let logoWidth = LOGO_MAX_WIDTH_MM;
    let logoHeight = logoWidth / ratio;
    if (logoHeight > LOGO_MAX_HEIGHT_MM) {
      logoHeight = LOGO_MAX_HEIGHT_MM;
      logoWidth = logoHeight * ratio;
    }

    doc.addImage(siteLogo.dataUrl, siteLogo.format, margin, 10, logoWidth, logoHeight);
    return 10 + logoHeight;
  } catch {
    return defaultBottom;
  }
}

function drawBlock(
  doc: InstanceType<typeof jsPDF>,
  x: number,
  y: number,
  title: string,
  lines: string[],
): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y);
  let lineY = y + 5;
  doc.setFont("helvetica", "normal");
  for (const line of lines) {
    if (!line) continue;
    doc.text(line, x, lineY);
    lineY += 4.5;
  }
  return lineY;
}

export type CustomerInvoiceItem = {
  product_title: string;
  variant_title?: string | null;
  quantity: number;
  unit_price_ht: number;
  box_quantity?: number | null;
};

export type CustomerInvoiceParams = {
  invoiceNumber: string;
  invoiceDate: string;
  orderNumber: string;
  customerName?: string | null;
  shippingAddress?: string | null;
  shippingCityLine?: string | null;
  items: CustomerInvoiceItem[];
  totalHT: number;
  totalTTC: number;
  siteLogo?: PdfSiteLogo | null;
};

/** Facture / reçu client — prix boutique et détail panier (pas le PDF fournisseur). */
export function generateCustomerInvoicePDF(params: CustomerInvoiceParams): string {
  const normalized = normalizeInvoiceLineItems(
    params.items,
    params.totalHT,
    params.totalTTC,
  );
  const { items: displayItems, productsHT, shippingHT } = normalized;
  const tvaAmount = roundMoney(params.totalTTC - params.totalHT);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const colGap = 8;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  const logoBottom = drawSiteLogo(doc, margin, params.siteLogo);
  let y = Math.max(logoBottom + 6, 28);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Facture client", margin, y);
  y += 12;

  const sellerLines = [
    CUSTOMER_INVOICE_SELLER.name,
    CUSTOMER_INVOICE_SELLER.addressLine1,
    `${CUSTOMER_INVOICE_SELLER.postalCode} ${CUSTOMER_INVOICE_SELLER.city}`,
    CUSTOMER_INVOICE_SELLER.country,
    `SIRET : ${CUSTOMER_INVOICE_SELLER.siret}`,
    `TVA intracom. : ${CUSTOMER_INVOICE_SELLER.vatNumber}`,
  ];

  const clientLines: string[] = [];
  if (params.customerName?.trim()) clientLines.push(params.customerName.trim());
  if (params.shippingAddress?.trim()) clientLines.push(params.shippingAddress.trim());
  if (params.shippingCityLine?.trim()) clientLines.push(params.shippingCityLine.trim());
  if (clientLines.length === 0) clientLines.push("—");

  const blockStartY = y;
  const sellerBottom = drawBlock(doc, margin, blockStartY, "Vendeur", sellerLines);
  const clientBottom = drawBlock(doc, margin + colWidth + colGap, blockStartY, "Client", clientLines);
  y = Math.max(sellerBottom, clientBottom) + 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`N° de facture : ${params.invoiceNumber}`, margin, y);
  doc.text(`Date de facture : ${params.invoiceDate}`, pageWidth - margin, y, { align: "right" });
  y += 6;
  doc.text(`Commande ${params.orderNumber}`, margin, y);
  y += 8;

  const tableData = displayItems.map((item) => {
    const variant = getDisplayVariantTitle(item.variant_title);
    let label = item.product_title;
    if (variant) label += ` (${variant})`;
    const boxLabel = getBoxQuantityLabel(item.box_quantity, item.variant_title);
    if (boxLabel) label += `\n${boxLabel}`;
    const lineHT = roundMoney(item.unit_price_ht * item.quantity);
    return [
      label,
      String(item.quantity),
      `${formatMoneyFr(item.unit_price_ht)} €`,
      `${formatMoneyFr(lineHT)} €`,
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Article", "Qté", "Prix unit. HT", "Total HT"]],
    body: tableData,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { halign: "center", cellWidth: 15 },
      2: { halign: "right", cellWidth: 35 },
      3: { halign: "right", cellWidth: 35 },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const totalsX = pageWidth - margin - 70;
  doc.setFontSize(10);
  doc.text("Sous-total produits HT", totalsX, y);
  doc.text(`${formatMoneyFr(productsHT)} €`, pageWidth - margin, y, { align: "right" });
  y += 6;

  doc.text("Frais de livraison HT", totalsX, y);
  doc.text(shippingHT > 0 ? `${formatMoneyFr(shippingHT)} €` : "Gratuite", pageWidth - margin, y, { align: "right" });
  y += 6;

  doc.text("Total HT", totalsX, y);
  doc.text(`${formatMoneyFr(params.totalHT)} €`, pageWidth - margin, y, { align: "right" });
  y += 6;

  doc.text("TVA (20 %)", totalsX, y);
  doc.text(`${formatMoneyFr(tvaAmount)} €`, pageWidth - margin, y, { align: "right" });
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Total TTC", totalsX, y);
  doc.text(`${formatMoneyFr(params.totalTTC)} €`, pageWidth - margin, y, { align: "right" });
  y += 14;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const legalText = CUSTOMER_INVOICE_LEGAL_LINES.join(" ");
  const legalLines = doc.splitTextToSize(legalText, pageWidth - margin * 2);
  for (const line of legalLines) {
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    doc.text(line, margin, y);
    y += 3.5;
  }

  return doc.output("datauristring").split(",")[1];
}
