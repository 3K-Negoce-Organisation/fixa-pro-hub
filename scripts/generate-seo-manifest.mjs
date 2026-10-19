/**
 * Génère public/seo-manifest.json : title / description / canonical par URL
 * pour l'injection HTML côté serveur (Google Search Console).
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import {
  STATIC_PAGES,
  buildCategoryDescription,
  buildCategoryTitle,
  buildProductDescription,
  buildProductTitle,
  toManifestEntry,
  withGeoExtras,
} from "./seo-data.mjs";
import { fetchCatalogProducts, loadVisABoisCatalog } from "./vis-a-bois-catalog.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY;

async function main() {
  const manifest = {};

  for (const [path, seo] of Object.entries(STATIC_PAGES)) {
    manifest[path] = withGeoExtras(
      path,
      toManifestEntry({
        title: seo.title,
        description: seo.description,
        canonical: path,
      }),
    );
  }

  if (!supabaseUrl || !supabaseKey) {
    console.warn("[seo-manifest] Supabase absent — manifest statique uniquement.");
  } else {
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      const scope = await loadVisABoisCatalog(supabase);
      const counted = await fetchCatalogProducts(supabase, scope, "category_id");
      const counts = {};
      for (const row of counted) {
        if (row.category_id) counts[row.category_id] = (counts[row.category_id] || 0) + 1;
      }

      for (const cat of scope.categories) {
        if (!cat.slug) continue;
        const key = `/produits?category=${encodeURIComponent(cat.slug)}`;
        const count = counts[cat.id] ?? 0;
        manifest[key] = toManifestEntry({
          title: buildCategoryTitle(cat.name),
          description: buildCategoryDescription(cat.name, count),
          canonical: key,
        });
      }

      const productRows = await fetchCatalogProducts(
        supabase,
        scope,
        "handle, title, description, diameter_mm, length_mm, material, drive_type, usage, categories(name)",
      );
      for (const product of productRows) {
        if (!product.handle) continue;
        const path = `/produit/${product.handle}`;
        manifest[path] = toManifestEntry({
          title: buildProductTitle(product.title),
          description: buildProductDescription(product),
          canonical: path,
        });
      }
    } catch (error) {
      console.warn("[seo-manifest] Erreur catalogue Vis-à-Bois:", error.message);
    }
  }

  const outPath = resolve(__dirname, "../public/seo-manifest.json");
  writeFileSync(outPath, JSON.stringify(manifest, null, 0), "utf8");
  console.log(`[seo-manifest] Écrit ${outPath} (${Object.keys(manifest).length} entrées)`);
}

main().catch((err) => {
  console.error("[seo-manifest] Échec:", err);
  process.exit(1);
});
