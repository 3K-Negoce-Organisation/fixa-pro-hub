import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_SLUG = Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";
const BUCKET = "order-documents";

function parseStoragePath(pathOrUrl: string): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("://")) return trimmed.replace(/^\/+/, "");
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/[^/]+\/(.+)$/,
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function pathAllowedForOrder(
  storagePath: string,
  order: { id: string; order_number: string; documents: unknown },
): boolean {
  const normalized = storagePath.replace(/^\/+/, "");
  const orderNumber = order.order_number.toUpperCase();
  if (
    normalized.startsWith(`${order.id}/`) ||
    normalized.startsWith(`${orderNumber}/`) ||
    normalized.startsWith(`${order.order_number}/`)
  ) {
    return true;
  }

  const docs = Array.isArray(order.documents) ? order.documents : [];
  return docs.some((entry) => {
    if (!entry || typeof entry !== "object") return false;
    const doc = entry as { path?: string; url?: string };
    const candidate = parseStoragePath(doc.path?.trim() || doc.url?.trim() || "");
    return candidate === normalized;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_number: rawOrder, email: rawEmail, path: rawPath } = await req.json() as {
      order_number?: string;
      email?: string;
      path?: string;
    };

    const order_number = (rawOrder ?? "").trim().toUpperCase();
    const email = (rawEmail ?? "").trim().toLowerCase();
    const storagePath = parseStoragePath(rawPath ?? "");

    if (!order_number || !email || !email.includes("@") || !storagePath) {
      return new Response(JSON.stringify({ error: "Paramètres invalides." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);

    const { data: site, error: siteErr } = await admin
      .from("sites")
      .select("storefront_public")
      .eq("slug", SITE_SLUG)
      .eq("is_active", true)
      .maybeSingle();

    if (siteErr) throw siteErr;
    if (!site?.storefront_public) {
      return new Response(JSON.stringify({ error: "Non disponible." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, user_email, documents")
      .eq("order_number", order_number)
      .maybeSingle();

    if (orderErr) throw orderErr;

    const orderEmail = (order?.user_email as string | null)?.trim().toLowerCase() ?? "";
    if (!order || orderEmail !== email) {
      return new Response(JSON.stringify({ error: "Commande introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pathAllowedForOrder(storagePath, order)) {
      return new Response(JSON.stringify({ error: "Document non autorisé." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(storagePath, 300);

    if (signErr || !signed?.signedUrl) {
      console.error("Signed URL error:", signErr);
      return new Response(JSON.stringify({ error: "Document introuvable." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signed_url: signed.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
