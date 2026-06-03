const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

export interface SupplierOrderEmailParams {
  supplierEmail: string;
  bccEmail?: string | null;
  fromEmail: string;
  fromName: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  shippingLine?: string | null;
  shippingCityLine?: string | null;
  pdfFilename: string;
  pdfBase64: string;
}

export async function sendSupplierOrderEmail(params: SupplierOrderEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error("[supplier-order-email] RESEND_API_KEY not set");
    return false;
  }
  if (!params.supplierEmail) {
    console.warn("[supplier-order-email] No supplier email — skipping");
    return false;
  }

  const html = `
<!DOCTYPE html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#1a1a1a;">Nouvelle commande ${params.orderNumber}</h2>
  <p>Bonjour,</p>
  <p>Veuillez trouver ci-joint le bon de commande <strong>${params.orderNumber}</strong>.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr><td style="padding:8px 0;color:#666;">Client</td><td style="padding:8px 0;">${params.customerName || "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${params.customerEmail || "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Téléphone</td><td style="padding:8px 0;">${params.customerPhone || "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#666;">Livraison</td><td style="padding:8px 0;">${[params.shippingLine, params.shippingCityLine].filter(Boolean).join(", ") || "—"}</td></tr>
  </table>
  <p style="color:#888;font-size:12px;">Envoi automatique — 3K Négoce</p>
</body>
</html>`;

  const payload: Record<string, unknown> = {
    from: `${params.fromName} <${params.fromEmail}>`,
    to: [params.supplierEmail],
    subject: `Nouvelle commande ${params.orderNumber}`,
    html,
    attachments: [
      {
        filename: params.pdfFilename,
        content: params.pdfBase64,
      },
    ],
  };
  if (params.bccEmail) payload.bcc = [params.bccEmail];

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
      console.error("[supplier-order-email] Resend error:", resp.status, await resp.text());
      return false;
    }
    const result = await resp.json();
    console.log("[supplier-order-email] Sent:", result.id, "→", params.supplierEmail);
    return true;
  } catch (e) {
    console.error("[supplier-order-email] Unexpected error:", e);
    return false;
  }
}
