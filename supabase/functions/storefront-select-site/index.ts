import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_SITE = "vis-a-bois";

function normalizeSiteSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function siteSelectHtml(slug: string, redirectPath: string): string {
  const safeSlug = JSON.stringify(slug);
  const safeRedirect = JSON.stringify(redirectPath);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Chargement…</title></head><body><script>
sessionStorage.setItem("storefront_site_slug", ${safeSlug});
location.replace(${safeRedirect});
</script></body></html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let siteRaw = "";
  let redirectPath = "/";

  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    siteRaw = String(body.site ?? "").trim();
    if (body.redirect) redirectPath = String(body.redirect);
  } else {
    const body = await req.text();
    const params = new URLSearchParams(body);
    siteRaw = params.get("site")?.trim() || "";
    redirectPath = params.get("redirect")?.trim() || "/";
  }

  const slug = normalizeSiteSlug(siteRaw) || DEFAULT_SITE;
  if (!redirectPath.startsWith("/")) redirectPath = "/";

  return new Response(siteSelectHtml(slug, redirectPath), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
