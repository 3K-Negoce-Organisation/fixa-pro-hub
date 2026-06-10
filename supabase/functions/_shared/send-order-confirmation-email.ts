import { getBoxQuantityLabel } from "./box-quantity.ts";
import { getDisplayVariantTitle } from "./variant-title.ts";

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
  /** Lien direct suivi commande (invité ou connecté) */
  trackingUrl?: string | null;
  /** Reply-to (ex. SAV) si différent de l'expéditeur Resend vérifié */
  replyTo?: string | null;
  /** Logo vitrine (URL publique HTTPS) */
  logoUrl?: string | null;
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
      const displayVariant = getDisplayVariantTitle(item.variantTitle);
      const label = displayVariant
        ? `${item.title} (${displayVariant})`
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

  const logoBlock = params.logoUrl
    ? `<img src="${escapeHtml(params.logoUrl)}" alt="${escapeHtml(params.fromName)}" width="180" style="display:block;margin:0 auto 12px;max-width:180px;height:auto;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:#c45a11;padding:28px 32px;text-align:center;">
      ${logoBlock}
      <p style="color:#fff;margin:0;font-size:22px;font-weight:bold;letter-spacing:0.02em;">${escapeHtml(params.fromName)}</p>
      <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:13px;">vis-a-bois.com</p>
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
      ${params.trackingUrl ? `
      <p style="margin:28px 0 8px;text-align:center;">
        <a href="${escapeHtml(params.trackingUrl)}" style="display:inline-block;background:#c45a11;color:#fff;text-decoration:none;padding:14px 28px;border-radius:6px;font-weight:bold;font-size:15px;">
          Suivre ma commande
        </a>
      </p>
      <p style="margin:0 0 24px;text-align:center;font-size:12px;color:#777;word-break:break-all;">
        Ou copiez ce lien : ${escapeHtml(params.trackingUrl)}
      </p>` : ""}
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

export async function sendOrderConfirmationEmail(params: OrderConfirmationEmailParams): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("[order-confirmation-email] RESEND_API_KEY not set");
    return { sent: false, error: "RESEND_API_KEY not set" };
  }
  if (!params.customerEmail) {
    console.warn("[order-confirmation-email] No customer email — skipping");
    return { sent: false, error: "No customer email" };
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
  if (params.replyTo) {
    payload.reply_to = [params.replyTo];
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
      const errText = await resp.text();
      console.error("[order-confirmation-email] Resend error:", resp.status, errText);
      return { sent: false, error: `Resend ${resp.status}: ${errText}` };
    }
    const result = await resp.json();
    console.log("[order-confirmation-email] Sent:", result.id, "→", params.customerEmail);
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[order-confirmation-email] Unexpected error:", e);
    return { sent: false, error: message };
  }
}
