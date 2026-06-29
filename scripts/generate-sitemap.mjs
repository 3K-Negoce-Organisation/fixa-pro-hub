/**
 * Génère public/sitemap.xml à partir des produits et catégories Supabase.
 * Variables : VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (ou SUPABASE_*)
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE_URL = "https://www.vis-a-bois.com";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

const STATIC_PATHS = [
  "/",
  "/produits",
  "/promos",
  "/information-technique",
  "/contact",
  "/faq",
  "/cgv",
  "/mentions-legales",
  "/politique-confidentialite",
  "/cookies",
  "/livraison",
  "/retours",
];

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function urlEntry(loc, changefreq = "weekly", priority = "0.7") {
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function main() {
  const urls = STATIC_PATHS.map((p) => urlEntry(`${SITE_URL}${p}`, p === "/" ? "daily" : "weekly", p === "/" ? "1.0" : "0.8"));

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      "[sitemap] VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY (ou ANON_KEY) absents — sitemap statique uniquement.",
    );
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("slug")
      .eq("is_active", true);

    if (catError) {
      console.warn("[sitemap] Erreur catégories:", catError.message);
    } else {
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
    }

    const { data: products, error: prodError } = await supabase
      .from("products")
      .select("handle")
      .eq("is_active", true);

    if (prodError) {
      console.warn("[sitemap] Erreur produits:", prodError.message);
    } else {
      for (const product of products ?? []) {
        if (product.handle) {
          urls.push(urlEntry(`${SITE_URL}/produit/${encodeURIComponent(product.handle)}`, "weekly", "0.6"));
        }
      }
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;

  const outPath = resolve(__dirname, "../public/sitemap.xml");
  writeFileSync(outPath, xml, "utf8");
  console.log(`[sitemap] Écrit ${outPath} (${urls.length} URLs)`);
}

main().catch((err) => {
  console.error("[sitemap] Échec:", err);
  process.exit(1);
});
