import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { alsafixCodeOnly } from "./alsafix-code.ts";
import {
  isSupplierLowUvDecimals,
  roundPdfFooterMoney,
  supplierElementQuantity,
  supplierPurchaseLineTotal,
  supplierTarifUv,
} from "./order-supplier-quantity.ts";
import type { PdfSiteLogo } from "./site-logo.ts";
import { drawMerchantLegalBlock } from "./document-branding.ts";

const LOGO_MAX_WIDTH_MM = 52;
const LOGO_MAX_HEIGHT_MM = 16;
const PAGE_BOTTOM_MARGIN_MM = 12;

function pageHeightMm(doc: InstanceType<typeof jsPDF>): number {
  return doc.internal.pageSize.getHeight();
}

/** Passe à une nouvelle page si le bloc à dessiner dépasse le bas de page. */
function ensureY(doc: InstanceType<typeof jsPDF>, y: number, neededHeight: number): number {
  if (y + neededHeight > pageHeightMm(doc) - PAGE_BOTTOM_MARGIN_MM) {
    doc.addPage();
    return PAGE_BOTTOM_MARGIN_MM + 8;
  }
  return y;
}

function formatMoneyFr(value: number, maxDecimals = 2, minDecimals = 2): string {
  const factor = 10 ** maxDecimals;
  const rounded = Math.round(value * factor) / factor;
  let fixed = rounded.toFixed(maxDecimals);
  if (minDecimals < maxDecimals) {
    const [intPart, decPart = ""] = fixed.split(".");
    const trimmedDec = decPart.replace(/0+$/, "");
    fixed = trimmedDec.length >= minDecimals
      ? `${intPart}.${trimmedDec}`
      : `${intPart}.${trimmedDec.padEnd(minDecimals, "0")}`;
  }
  const [intPart, decPart = ""] = fixed.split(".");
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  if (maxDecimals === 0 || !decPart) return withSpaces;
  return `${withSpaces},${decPart}`;
}

function drawSiteLogo(
  doc: InstanceType<typeof jsPDF>,
  margin: number,
  siteLogo?: PdfSiteLogo | null,
): number {
  const defaultBottom = 6;
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

    doc.addImage(siteLogo.dataUrl, siteLogo.format, margin, 6, logoWidth, logoHeight);
    return 6 + logoHeight;
  } catch {
    return defaultBottom;
  }
}

export function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: Array<Record<string, unknown>>,
  shippingAddress: {
    name?: string;
    line1?: string;
    line2?: string;
    city?: string;
    postal_code?: string;
  } | null,
  customerPhone?: string | null,
  siteLogo?: PdfSiteLogo | null,
  /** E-mail de contact transporteur (ex. service client Vis-à-Bois). */
  carrierContactEmail?: string | null,
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
  const lineTotalForItem = (item: Record<string, unknown>) =>
    supplierPurchaseLineTotal(
      item,
      item.product_purchase_price_ht as number | null | undefined,
      item.product_box_quantity as number | null | undefined,
    );

  const supplierProductsHTRaw = items.reduce((sum, item) => sum + lineTotalForItem(item), 0);
  const supplierProductsHT = roundPdfFooterMoney(supplierProductsHTRaw);
  const tvaAmount = roundPdfFooterMoney(supplierProductsHT * 0.2);
  const productsTTC = roundPdfFooterMoney(supplierProductsHT * 1.2);

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const tableWidth = pageWidth - 2 * margin;

  const headerBlue: [number, number, number] = [30, 58, 95];
  const totalGreen: [number, number, number] = [212, 237, 218];
  const infoDarkBlue = [25, 50, 85];

  drawMerchantLegalBlock(doc, pageWidth, margin);
  const logoBottom = drawSiteLogo(doc, margin, siteLogo);
  const dateY = logoBottom + 4;
  const orderLabelY = dateY + 7;
  const subtitleY = orderLabelY + 5;
  const tableStartY = subtitleY + 5;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.text(dateStr, margin, dateY);

  doc.setFont("helvetica", "normal");
  doc.text("commande", margin, orderLabelY);
  doc.setFont("helvetica", "bold");
  doc.text(orderNumber, margin + 25, orderLabelY);

  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`N° clt ${customerNumber}`, pageWidth - margin, orderLabelY, { align: "right" });
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(
    "Bon de commande fournisseur — tarifs d'achat HT (Qté = unités / éléments, pas les boîtes panier)",
    margin,
    subtitleY,
  );
  doc.setFont("helvetica", "normal");

  const tableHeaders = [["Code", "Désignation", "Qté élém.", "Tarif UV.", "Prix total HT net"]];

  const tableData = items.map((item) => {
    const productPurchase = item.product_purchase_price_ht as number | null | undefined;
    const productBoxQty = item.product_box_quantity as number | null | undefined;
    const productUniteDeVente = item.product_unite_de_vente as number | null | undefined;
    const elementQty = supplierElementQuantity(item, productBoxQty);
    const tarifUv = supplierTarifUv(item, productPurchase, productBoxQty, productUniteDeVente);
    const totalItemHT = lineTotalForItem(item);
    const tarifDecimals = isSupplierLowUvDecimals(item, productUniteDeVente) ? 2 : 4;
    return [
      alsafixCodeOnly(item.code_alsafix as string | undefined),
      (item.title || item.product_title || "") as string,
      String(elementQty),
      `${formatMoneyFr(tarifUv, tarifDecimals, 2)} €`,
      `${formatMoneyFr(totalItemHT, 2, 2)} €`,
    ];
  });

  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    tableWidth,
    head: tableHeaders,
    body: tableData,
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { cellWidth: tableWidth * 0.14 },
      1: { cellWidth: tableWidth * 0.38 },
      2: { cellWidth: tableWidth * 0.08, halign: "center" },
      3: { cellWidth: tableWidth * 0.20, halign: "right" },
      4: { cellWidth: tableWidth * 0.20, halign: "right" },
    },
    didParseCell(data) {
      if (data.section === "body") {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  const lastTable = (doc as {
    lastAutoTable?: {
      settings?: { margin?: { left?: number } };
      table?: { width?: number };
      finalY?: number;
    };
  }).lastAutoTable;
  const tableLeft = lastTable?.settings?.margin?.left ?? margin;
  const tableDrawWidth = lastTable?.table?.width ?? tableWidth;
  const finalY = lastTable?.finalY ?? 100;

  const summaryRight = tableLeft + tableDrawWidth - 10;
  const summaryLabelX = tableLeft + tableDrawWidth - 55;
  const footerBlockHeight = 28 + 45;
  let summaryY = ensureY(doc, finalY + 6, footerBlockHeight);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total achat fournisseur HT", summaryLabelX, summaryY, { align: "right" });
  doc.text(`${formatMoneyFr(supplierProductsHT, 2)} €`, summaryRight, summaryY, { align: "right" });
  summaryY += 5;
  doc.text("TVA achat (20 %)", summaryLabelX, summaryY, { align: "right" });
  doc.text(`${formatMoneyFr(tvaAmount, 2)} €`, summaryRight, summaryY, { align: "right" });

  const totalRowY = summaryY + 5;
  doc.setFillColor(totalGreen[0], totalGreen[1], totalGreen[2]);
  doc.rect(tableLeft, totalRowY, tableDrawWidth, 10, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(tableLeft, totalRowY, tableDrawWidth, 10, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL ACHAT FOURNISSEUR TTC", tableLeft + 8, totalRowY + 7);
  doc.text(`${formatMoneyFr(productsTTC, 2)} €`, summaryRight, totalRowY + 7, { align: "right" });

  const addressY = ensureY(doc, totalRowY + 12 + 8, 55);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Adresse de livraison", margin, addressY);

  doc.setFont("helvetica", "normal");
  let currentY = addressY + 6;

  if (shippingAddress) {
    const displayShippingName = shippingAddress.name || customerName;
    if (displayShippingName) {
      doc.text(displayShippingName, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line1) {
      doc.text(shippingAddress.line1, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.postal_code || shippingAddress.city) {
      doc.text(`${shippingAddress.postal_code || ""} ${shippingAddress.city || ""}`.trim(), margin + 10, currentY);
      currentY += 5;
    }
  }

  const phone = customerPhone?.trim();
  if (phone) {
    doc.text(`Tél. ${phone}`, margin + 10, currentY);
    currentY += 5;
  }

  const clientEmail = customerEmail?.trim();
  if (clientEmail) {
    doc.text(`E-mail client ${clientEmail}`, margin + 10, currentY);
    currentY += 5;
  }

  const carrierEmail = carrierContactEmail?.trim();
  if (carrierEmail) {
    doc.text(`E-mail de contact transporteur ${carrierEmail}`, margin + 10, currentY);
    currentY += 5;
  }

  currentY = ensureY(doc, currentY + 6, 12);
  doc.setFont("helvetica", "bold");
  doc.text("Livraison direct sans BL chiffré", margin, currentY);

  return doc.output("datauristring").split(",")[1];
}
