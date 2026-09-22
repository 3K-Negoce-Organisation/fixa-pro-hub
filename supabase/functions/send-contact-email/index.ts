import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveResendFrom } from "../_shared/resolve-resend-from.ts";
import { storefrontBrandForSlug } from "../_shared/storefront-url.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  site_slug?: string;
}

const FALLBACK_BY_SLUG: Record<string, { to: string; fromName: string }> = {
  "vis-a-bois": { to: "contact@vis-a-bois.com", fromName: "Vis-à-Bois" },
  "3k-negoce": { to: "contact@3k-negoce.com", fromName: "3K-Négoce" },
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ContactRequest = await req.json();
    const { name, email, phone, subject, message } = body;
    const siteSlug =
      (body.site_slug ?? "").trim().toLowerCase() ||
      Deno.env.get("STOREFRONT_SITE_SLUG") ||
      "vis-a-bois";

    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ error: "Tous les champs obligatoires doivent être remplis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Format d'email invalide" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } },
      );
    }

    const fallback = FALLBACK_BY_SLUG[siteSlug] ?? FALLBACK_BY_SLUG["vis-a-bois"];
    let toEmail = fallback.to;
    let settings: {
      name?: string | null;
      customer_service_email?: string | null;
      email?: string | null;
      status_email?: string | null;
    } | undefined;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    if (serviceKey && supabaseUrl) {
      const admin = createClient(supabaseUrl, serviceKey);
      const { data: site } = await admin
        .from("sites")
        .select("id")
        .eq("slug", siteSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (site?.id) {
        const { data: row } = await admin
          .from("supplier_settings")
          .select("name, email, status_email, customer_service_email")
          .eq("site_id", site.id)
          .maybeSingle();
        if (row) {
          settings = row;
          const resolved =
            (row.customer_service_email || row.email || row.status_email || "").trim();
          if (resolved) toEmail = resolved;
        }
      }
    }

    const { fromEmail, fromName, replyTo } = resolveResendFrom(settings, { siteSlug });
    const brand = storefrontBrandForSlug(siteSlug) || fromName || fallback.fromName;

    console.log(`Sending contact email from ${name} (${email}) site=${siteSlug} to=${toEmail}`);

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${brand} <${fromEmail}>`,
        to: [toEmail],
        reply_to: replyTo || email,
        subject: `[Contact ${brand}] ${subject}`,
        html: `
          <h2>Nouveau message de contact (${brand})</h2>
          <p><strong>Nom:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          ${phone ? `<p><strong>Téléphone:</strong> ${phone}</p>` : ""}
          <p><strong>Sujet:</strong> ${subject}</p>
          <hr />
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.text();
      console.error("Resend API error:", errorData);
      throw new Error("Erreur lors de l'envoi de l'email");
    }

    const result = await emailResponse.json();
    console.log("Email sent successfully:", result);

    return new Response(
      JSON.stringify({ success: true, message: "Message envoyé avec succès" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur lors de l'envoi du message";
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } },
    );
  }
};

serve(handler);
