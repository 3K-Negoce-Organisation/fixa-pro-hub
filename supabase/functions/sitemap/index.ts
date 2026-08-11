import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const SITE_URL = "https://www.vis-a-bois.com";

const STATIC_PATHS = [
  "/",
  "/produits",
  "/information-technique",
  "/contact",
  "/faq",
  "/blog",
  "/avis-clients",
  "/cgv",
  "/mentions-legales",
  "/politique-confidentialite",
  "/cookies",
  "/livraison",
  "/retours",
];

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc: string, changefreq = "weekly", priority = "0.7"): string {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const urls = STATIC_PATHS.map((p) =>
      urlEntry(`${SITE_URL}${p}`, p === "/" ? "daily" : "weekly", p === "/" ? "1.0" : "0.8"),
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey);

      const { data: categories } = await supabase
        .from("sub_category")
        .select("slug")
        .eq("is_active", true);

      for (const cat of categories ?? []) {
        if (cat.slug) {
          urls.push(
            urlEntry(
              `${SITE_URL}/produits?category=${encodeURIComponent(cat.slug)}`,
              "weekly",
              "0.8",
            ),
          );
        }
      }

      const { data: products } = await supabase
        .from("products")
        .select("handle")
        .eq("is_active", true);

      for (const product of products ?? []) {
        if (product.handle) {
          urls.push(
            urlEntry(`${SITE_URL}/produit/${encodeURIComponent(product.handle)}`, "weekly", "0.6"),
          );
        }
      }

      const { data: blogPosts } = await supabase
        .from("blog_posts")
        .select("slug")
        .eq("is_published", true);

      for (const post of blogPosts ?? []) {
        if (post.slug) {
          urls.push(
            urlEntry(`${SITE_URL}/blog/${encodeURIComponent(post.slug)}`, "weekly", "0.6"),
          );
        }
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[sitemap]", error);
    return new Response("Sitemap generation failed", { status: 500 });
  }
});
