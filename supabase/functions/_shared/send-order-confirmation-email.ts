import { getBoxQuantityLabel } from "./box-quantity.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export interface OrderConfirmationItem {
  title: string;
  variantTitle?: string | null;
  quantity: number;
  unit_price_ht: number;
  boxQuantity?: number | null;
}

export interface OrderConfirmationEmailParams {
  customerEmail: string;
  fromEmail: string;
  fromName: string;
  bccEmail?: string | null;
  orderNumber: string;
  items: OrderConfirmationItem[];
  productsHT: number;
  shippingHT: number;
  totalHT: number;
  totalTTC: number;
  shippingName?: string | null;
  shippingAddress?: string | null;
  shippingCityLine?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildOrderConfirmationHtml(params: OrderConfirmationEmailParams): string {
  const itemsRows = params.items
    .map((item) => {
      const label = item.variantTitle && item.variantTitle !== "Unité"
        ? `${item.title} (${item.variantTitle})`
        : item.title;
      const lineHT = item.unit_price_ht * item.quantity;
      const boxLabel = getBoxQuantityLabel(item.boxQuantity, item.variantTitle);
      const articleCell = boxLabel
        ? `${escapeHtml(label)}<br/><span style="color:#777;font-size:12px;">${escapeHtml(boxLabel)}</span>`
        : escapeHtml(label);
      return `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">${articleCell}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${lineHT.toFixed(2)} € HT</td>
        </tr>`;
    })
    .join("");

  const shippingRow = params.shippingHT > 0
    ? `<tr><td colspan="2" style="padding:8px 0;border-bottom:1px solid #eee;">Frais de livraison</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${params.shippingHT.toFixed(2)} € HT</td></tr>`
    : `<tr><td colspan="2" style="padding:8px 0;border-bottom:1px solid #eee;">Frais de livraison</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">Gratuite</td></tr>`;

  const addressBlock = [
    params.shippingName,
    params.shippingAddress,
    params.shippingCityLine,
  ].filter(Boolean).map((line) => `<p style="margin:0 0 4px;">${escapeHtml(line!)}</p>`).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#1a1a2e;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${escapeHtml(params.fromName)}</h1>
    </div>
    <div style="padding:32px;color:#333;">
      <p style="margin-top:0;">Bonjour${params.shippingName ? ` ${escapeHtml(params.shippingName)}` : ""},</p>
      <p>Votre commande <strong>${escapeHtml(params.orderNumber)}</strong> a bien été enregistrée et payée.</p>
      <h2 style="font-size:16px;margin:24px 0 12px;">Récapitulatif</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr>
            <th style="text-align:left;padding-bottom:8px;border-bottom:2px solid #ddd;">Article</th>
            <th style="text-align:center;padding-bottom:8px;border-bottom:2px solid #ddd;">Qté</th>
            <th style="text-align:right;padding-bottom:8px;border-bottom:2px solid #ddd;">Total HT</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows}
          ${shippingRow}
        </tbody>
      </table>
      <p style="margin:16px 0 4px;text-align:right;"><strong>Total TTC : ${params.totalTTC.toFixed(2)} €</strong></p>
      <p style="margin:0 0 24px;text-align:right;color:#777;">Total HT : ${params.totalHT.toFixed(2)} €</p>
      ${addressBlock ? `<h2 style="font-size:16px;margin:0 0 8px;">Adresse de livraison</h2>${addressBlock}` : ""}
      <p style="margin-top:24px;">Livraison estimée : 24–48 h. Vous recevrez un email avec le numéro de suivi dès l'expédition.</p>
      <p>Merci pour votre confiance,<br/><strong>${escapeHtml(params.fromName)}</strong></p>
    </div>
    <div style="background:#f9f9f9;padding:16px 32px;font-size:12px;color:#aaa;text-align:center;">
      Cet email confirme votre commande — conservez-le pour vos archives.
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(params: OrderConfirmationEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[order-confirmation-email] RESEND_API_KEY not set");
    return false;
  }
  if (!params.customerEmail) {
    console.warn("[order-confirmation-email] No customer email — skipping");
    return false;
  }

  const payload: Record<string, unknown> = {
    from: `${params.fromName} <${params.fromEmail}>`,
    to: [params.customerEmail],
    subject: `Confirmation de commande ${params.orderNumber}`,
    html: buildOrderConfirmationHtml(params),
  };
  if (params.bccEmail) {
    payload.bcc = [params.bccEmail];
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      console.error("[order-confirmation-email] Resend error:", resp.status, await resp.text());
      return false;
    }
    const result = await resp.json();
    console.log("[order-confirmation-email] Sent:", result.id, "→", params.customerEmail);
    return true;
  } catch (e) {
    console.error("[order-confirmation-email] Unexpected error:", e);
    return false;
  }
}
