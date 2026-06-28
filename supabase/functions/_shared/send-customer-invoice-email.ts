const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export interface SendCustomerInvoiceEmailParams {
  customerEmail: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  orderNumber: string;
  invoiceNumber: string;
  customerName?: string | null;
  pdfBase64: string;
  filename: string;
}

function buildHtml(params: SendCustomerInvoiceEmailParams): string {
  const greeting = params.customerName?.trim()
    ? `Bonjour ${params.customerName.trim()},`
    : "Bonjour,";

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.5;">
  <p>${greeting}</p>
  <p>Votre commande <strong>${params.orderNumber}</strong> a été livrée.</p>
  <p>Veuillez trouver ci-joint votre facture <strong>${params.invoiceNumber}</strong>.</p>
  <p style="margin-top: 24px; font-size: 13px; color: #666;">
    ${params.fromName} — Service client
  </p>
</body>
</html>`;
}

export async function sendCustomerInvoiceEmail(
  params: SendCustomerInvoiceEmailParams,
): Promise<{ sent: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.error("[send-customer-invoice-email] RESEND_API_KEY not set");
    return { sent: false, error: "RESEND_API_KEY not set" };
  }

  const to = params.customerEmail.trim();
  if (!to) {
    return { sent: false, error: "customer email missing" };
  }

  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${params.fromName} <${params.fromEmail}>`,
        to: [to],
        reply_to: params.replyTo || undefined,
        subject: `Votre facture ${params.invoiceNumber} — commande ${params.orderNumber}`,
        html: buildHtml(params),
        attachments: [{
          filename: params.filename,
          content: params.pdfBase64,
        }],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("[send-customer-invoice-email] Resend error:", text);
      return { sent: false, error: text };
    }

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[send-customer-invoice-email]", message);
    return { sent: false, error: message };
  }
}
