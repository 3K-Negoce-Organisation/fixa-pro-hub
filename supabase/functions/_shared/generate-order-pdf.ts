import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { alsafixCodeOnly } from "./alsafix-code.ts";
import {
  supplierElementQuantity,
  supplierPurchaseLineTotal,
  supplierTarifUv,
} from "./order-supplier-quantity.ts";
import type { PdfSiteLogo } from "./site-logo.ts";

const LOGO_MAX_WIDTH_MM = 45;
const LOGO_MAX_HEIGHT_MM = 14;

function drawSiteLogo(
  doc: InstanceType<typeof jsPDF>,
  pageWidth: number,
  margin: number,
  siteLogo?: PdfSiteLogo | null,
): void {
  if (!siteLogo) return;

  const ratio = siteLogo.width / siteLogo.height;
  let logoWidth = LOGO_MAX_WIDTH_MM;
  let logoHeight = logoWidth / ratio;

  if (logoHeight > LOGO_MAX_HEIGHT_MM) {
    logoHeight = LOGO_MAX_HEIGHT_MM;
    logoWidth = logoHeight * ratio;
  }

  const logoX = pageWidth - margin - logoWidth;
  doc.addImage(siteLogo.dataUrl, siteLogo.format, logoX, 6, logoWidth, logoHeight);
}

export function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  _customerEmail: string,
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
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
  const lineTotalForItem = (item: Record<string, unknown>) =>
    (item.purchase_line_total as number | undefined) ??
    supplierPurchaseLineTotal(item, item.purchase_price_ht as number | null | undefined, item.box_quantity as number | null | undefined);

  // PDF fournisseur : total = somme des « Prix total HT net » (hors frais de livraison)
  const supplierProductsHT = Math.round(
    items.reduce((sum, item) => sum + lineTotalForItem(item), 0) * 100,
  ) / 100;
  const tvaAmount = Math.round(supplierProductsHT * 0.2 * 100) / 100;
  const productsTTC = Math.round(supplierProductsHT * 1.2 * 100) / 100;

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

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(dateStr, margin, 15);

  drawSiteLogo(doc, pageWidth, margin, siteLogo);

  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
  doc.text("commande", margin, 22);
  doc.setFont("helvetica", "bold");
  doc.text(orderNumber, margin + 25, 22);

  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`N° clt ${customerNumber}`, pageWidth - margin, 22, { align: "right" });
  doc.setTextColor(0, 0, 0);

  const tableHeaders = [["Code", "Désignation", "Qté", "Tarif UV.", "Prix total HT net"]];

  const tableData = items.map((item) => {
    const elementQty = (item.element_quantity as number | undefined) ??
      supplierElementQuantity(item, item.box_quantity as number | null | undefined);
    const tarifUv = (item.tarif_uv as number | undefined) ??
      supplierTarifUv(item, item.purchase_price_ht as number | null | undefined, item.box_quantity as number | null | undefined);
    const totalItemHT = lineTotalForItem(item);
    return [
      alsafixCodeOnly(item.code_alsafix as string | undefined),
      (item.title || item.product_title || "") as string,
      String(elementQty),
      `${tarifUv.toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`,
    ];
  });

  autoTable(doc, {
    startY: 30,
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

  const lastTable = (doc as { lastAutoTable: { settings: { margin: { left: number } }; table: { width: number }; finalY: number } }).lastAutoTable;
  const tableLeft = lastTable.settings.margin.left;
  const tableDrawWidth = lastTable.table.width;
  const finalY = lastTable.finalY || 100;

  const summaryRight = tableLeft + tableDrawWidth - 10;
  const summaryLabelX = tableLeft + tableDrawWidth - 55;
  let summaryY = finalY + 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Total HT", summaryLabelX, summaryY, { align: "right" });
  doc.text(`${supplierProductsHT.toFixed(2)} €`, summaryRight, summaryY, { align: "right" });
  summaryY += 5;
  doc.text("TVA (20 %)", summaryLabelX, summaryY, { align: "right" });
  doc.text(`${tvaAmount.toFixed(2)} €`, summaryRight, summaryY, { align: "right" });

  const totalRowY = summaryY + 5;
  doc.setFillColor(totalGreen[0], totalGreen[1], totalGreen[2]);
  doc.rect(tableLeft, totalRowY, tableDrawWidth, 10, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(tableLeft, totalRowY, tableDrawWidth, 10, "S");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL TTC", tableLeft + tableDrawWidth * 0.55, totalRowY + 7);
  doc.text(`${productsTTC.toFixed(2)} €`, summaryRight, totalRowY + 7, { align: "right" });

  const addressY = totalRowY + 20;
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

  currentY += 10;
  doc.setFont("helvetica", "bold");
  doc.text("Livraison direct sans BL chiffré", margin, currentY);

  return doc.output("datauristring").split(",")[1];
}
