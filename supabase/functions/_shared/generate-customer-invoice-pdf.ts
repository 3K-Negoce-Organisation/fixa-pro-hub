import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { getBoxQuantityLabel } from "./box-quantity.ts";
import { normalizeInvoiceLineItems } from "./order-totals.ts";
import { roundMoney } from "./money.ts";
import { getDisplayVariantTitle } from "./variant-title.ts";
import type { PdfSiteLogo } from "./site-logo.ts";
import {
  CUSTOMER_INVOICE_LEGAL_LINES,
  formatCustomerInvoiceSellerLines,
} from "./customer-invoice-seller.ts";
import { drawMerchantLegalBlock } from "./document-branding.ts";

const LOGO_MAX_WIDTH_MM = 40;
const LOGO_MAX_HEIGHT_MM = 12;
const FOOTER_FONT_SIZE = 8;
const FOOTER_LINE_HEIGHT = 3.5;
const PAGE_NUM_BAND_MM = 8;

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

function drawPageFooters(
  doc: InstanceType<typeof jsPDF>,
  margin: number,
  contentEndY: number,
): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const legalText = CUSTOMER_INVOICE_LEGAL_LINES.join(" ");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(FOOTER_FONT_SIZE);
  const legalLines = doc.splitTextToSize(legalText, pageWidth - margin * 2);
  const legalBlockHeight = legalLines.length * FOOTER_LINE_HEIGHT;

  let totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);

  let pageNumBand = totalPages > 1 ? PAGE_NUM_BAND_MM : 0;
  let legalTopY = pageHeight - margin - pageNumBand - legalBlockHeight;

  if (legalTopY < contentEndY + 6) {
    doc.addPage();
    totalPages = doc.getNumberOfPages();
    pageNumBand = totalPages > 1 ? PAGE_NUM_BAND_MM : 0;
    legalTopY = pageHeight - margin - pageNumBand - legalBlockHeight;
  }

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    if (page === totalPages) {
      doc.setFontSize(FOOTER_FONT_SIZE);
      doc.setFont("helvetica", "normal");
      for (let i = 0; i < legalLines.length; i += 1) {
        doc.text(legalLines[i], margin, legalTopY + i * FOOTER_LINE_HEIGHT);
      }
    }
    if (totalPages > 1) {
      doc.setFontSize(FOOTER_FONT_SIZE);
      doc.setFont("helvetica", "normal");
      doc.text(
        `Page ${page} / ${totalPages}`,
        pageWidth / 2,
        pageHeight - margin + 2,
        { align: "center" },
      );
    }
  }
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
  /** JJ/MM/AAAA — affichée uniquement si renseignée. */
  deliveryDate?: string | null;
  /** JJ/MM/AAAA — mention « Facture acquittée le … » sous le Total TTC. */
  paidDate?: string | null;
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
  const margin = 18;
  const colGap = 8;
  const colWidth = (pageWidth - margin * 2 - colGap) / 2;

  const tableLeft = margin;
  const tableWidth = pageWidth - margin * 2;
  const colArticle = 85;
  const colQty = 15;
  const colUnit = 35;
  const colTotal = tableWidth - colArticle - colQty - colUnit;
  const colTotalStart = tableLeft + colArticle + colQty + colUnit;
  const tableRight = tableLeft + tableWidth;

  drawMerchantLegalBlock(doc, pageWidth, margin);
  const logoBottom = drawSiteLogo(doc, margin, params.siteLogo);
  let y = Math.max(logoBottom + 6, 28);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Facture client", margin, y);
  y += 12;

  const sellerLines = formatCustomerInvoiceSellerLines();

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
  if (params.deliveryDate?.trim()) {
    doc.text(`Date de livraison : ${params.deliveryDate.trim()}`, pageWidth - margin, y, { align: "right" });
  }
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
    margin: { left: tableLeft, right: margin },
    tableWidth,
    head: [["Article", "Qté", "Prix unit. HT", "Total HT"]],
    body: tableData,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: colArticle },
      1: { halign: "center", cellWidth: colQty },
      2: { halign: "right", cellWidth: colUnit },
      3: { halign: "right", cellWidth: colTotal },
    },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  const drawTotalLine = (label: string, value: string, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 11 : 10);
    doc.text(label, colTotalStart - 2, y, { align: "right" });
    doc.text(value, tableRight, y, { align: "right" });
    y += bold ? 8 : 6;
  };

  drawTotalLine("Sous-total produits HT", `${formatMoneyFr(productsHT)} €`);
  drawTotalLine(
    "Frais de livraison HT",
    shippingHT > 0 ? `${formatMoneyFr(shippingHT)} €` : "Gratuite",
  );
  drawTotalLine("Total HT", `${formatMoneyFr(params.totalHT)} €`);
  drawTotalLine("TVA (20 %)", `${formatMoneyFr(tvaAmount)} €`);
  drawTotalLine("Total TTC", `${formatMoneyFr(params.totalTTC)} €`, true);

  if (params.paidDate?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Facture acquittée le ${params.paidDate.trim()}`, tableRight, y, { align: "right" });
    y += 8;
  }

  drawPageFooters(doc, margin, y);

  return doc.output("datauristring").split(",")[1];
}
