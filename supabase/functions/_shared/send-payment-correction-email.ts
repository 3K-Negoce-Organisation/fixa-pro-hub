const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export interface PaymentCorrectionEmailParams {
  customerEmail: string;
  fromEmail: string;
  fromName: string;
  bccEmail?: string | null;
  orderNumber: string;
  amountTtc: number;
  paymentUrl: string;
  note?: string | null;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildHtml(params: PaymentCorrectionEmailParams): string {
  const noteBlock = params.note
    ? `<p style="margin:16px 0;color:#444;">${escapeHtml(params.note)}</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family:Arial,sans-serif;line-height:1.5;color:#222;">
  <p>Bonjour,</p>
  <p>Un complément de paiement est demandé pour votre commande <strong>${escapeHtml(params.orderNumber)}</strong>.</p>
  <p>Montant à régler : <strong>${params.amountTtc.toFixed(2).replace(".", ",")} € TTC</strong></p>
  ${noteBlock}
  <p style="margin:24px 0;">
    <a href="${escapeHtml(params.paymentUrl)}" style="background:#c45a11;color:#fff;padding:12px 20px;text-decoration:none;border-radius:6px;display:inline-block;">
      Payer en ligne
    </a>
  </p>
  <p style="font-size:13px;color:#666;">Si le bouton ne fonctionne pas, copiez ce lien :<br/>${escapeHtml(params.paymentUrl)}</p>
  <p>Cordialement,<br/>${escapeHtml(params.fromName)}</p>
</body>
</html>`;
}

export async function sendPaymentCorrectionEmail(params: PaymentCorrectionEmailParams): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("[send-payment-correction-email] RESEND_API_KEY missing");
    return;
  }

  const to = [{ email: params.customerEmail }];
  const bcc = params.bccEmail ? [{ email: params.bccEmail }] : undefined;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${params.fromName} <${params.fromEmail}>`,
      to,
      bcc,
      subject: `Paiement complémentaire — commande ${params.orderNumber}`,
      html: buildHtml(params),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
