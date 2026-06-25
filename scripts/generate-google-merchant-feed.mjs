#!/usr/bin/env node
/**
 * Génère un fichier TSV Google Merchant Center (spec produits).
 * Guide : https://support.google.com/merchants/answer/12631822
 *
 * Usage :
 *   source ../scripts/load-3k-env.sh   # ou variables VITE_SUPABASE_*
 *   node scripts/generate-google-merchant-feed.mjs
 *   node scripts/generate-google-merchant-feed.mjs --out public/google-merchant-feed.tsv
 *   node scripts/generate-google-merchant-feed.mjs --env production
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadRefsEnv() {
  const path = resolve(__dirname, "../../scripts/supabase-refs.env");
  try {
    const content = readFileSync(path, "utf8");
    const env = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const envIdx = args.indexOf("--env");
const outPath = outIdx >= 0 ? args[outIdx + 1] : resolve(__dirname, "../public/google-merchant-feed.tsv");
const targetEnv = envIdx >= 0 ? args[envIdx + 1] : "production";

const refs = loadRefsEnv();
const suffix = targetEnv === "staging" ? "STAGING" : targetEnv === "develop" ? "DEVELOP" : "PRODUCTION";

const supabaseUrl =
  (refs[`SUPABASE_REF_${suffix}`] ? `https://${refs[`SUPABASE_REF_${suffix}`]}.supabase.co` : undefined) ||
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL;

const supabaseKey =
  refs[`SUPABASE_SERVICE_ROLE_KEY_${suffix}`] ||
  process.env[`SUPABASE_SERVICE_ROLE_KEY_${suffix}`] ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Définir SUPABASE_URL + SERVICE_ROLE_KEY (ou VITE_SUPABASE_*).");
  process.exit(1);
}

const GOOGLE_MERCHANT_SITE_URL = "https://www.vis-a-bois.com";
const GOOGLE_PRODUCT_CATEGORY = "1732";
const GOOGLE_MERCHANT_BRAND = "Vis-à-Bois";

const FEED_HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "availability",
  "price",
  "sale_price",
  "brand",
  "gtin",
  "mpn",
  "condition",
  "google_product_category",
  "product_type",
  "identifier_exists",
];

function stripText(value, maxLength) {
  const plain = String(value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength - 1)}…`;
}

function firstImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === "string" && first.startsWith("http")) return first;
  if (first?.url?.startsWith("http")) return first.url;
  return null;
}

function formatPrice(amount) {
  return `${Number(amount).toFixed(2)} EUR`;
}

function normalizeGtin(ean) {
  if (!ean) return null;
  const digits = String(ean).replace(/\D/g, "");
  if ([8, 12, 13, 14].includes(digits.length)) return digits;
  return null;
}

function buildRow(product) {
  if (product.is_active === false) return null;
  const imageLink = firstImageUrl(product.images);
  if (!imageLink) return null;

  const description = stripText(
    product.description || product.designation_fr || product.title,
    5000,
  );
  if (!description) return null;

  const gtin = normalizeGtin(product.ean);
  const mpn = product.code_alsafix?.trim() || product.id;
  const stock = product.stock ?? 0;
  const priceTtc = Number(product.price_ttc);
  const promoPriceHt =
    product.is_promo && product.promo_price_ht != null ? Number(product.promo_price_ht) * 1.2 : null;

  return {
    id: product.code_alsafix?.trim() || product.id,
    title: stripText(product.title, 150),
    description,
    link: `${GOOGLE_MERCHANT_SITE_URL}/produit/${encodeURIComponent(product.handle)}`,
    image_link: imageLink,
    availability: stock > 0 ? "in_stock" : "out_of_stock",
    price: formatPrice(priceTtc),
    sale_price: promoPriceHt != null && promoPriceHt < priceTtc ? formatPrice(promoPriceHt) : "",
    brand: GOOGLE_MERCHANT_BRAND,
    gtin: gtin ?? "",
    mpn,
    condition: "new",
    google_product_category: GOOGLE_PRODUCT_CATEGORY,
    product_type: stripText(product.category, 750),
    identifier_exists: gtin || mpn ? "TRUE" : "FALSE",
  };
}

function toTsv(rows) {
  const escape = (value) => {
    const str = String(value ?? "");
    return /[\t"\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  return [
    FEED_HEADERS.join("\t"),
    ...rows.map((row) => FEED_HEADERS.map((h) => escape(row[h])).join("\t")),
  ].join("\n") + "\n";
}

async function main() {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const { data: products, error } = await supabase
    .from("products")
    .select(
      "id, handle, title, description, designation_fr, price_ttc, price_ht, promo_price_ht, is_promo, stock, images, ean, code_alsafix, category, material, is_active",
    )
    .eq("is_active", true)
    .order("title");

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const rows = (products ?? []).map(buildRow).filter(Boolean);
  const tsv = toTsv(rows);
  writeFileSync(outPath, tsv, "utf8");

  console.log(`→ ${rows.length} produits exportés (${products?.length ?? 0} actifs en base)`);
  console.log(`→ Fichier : ${outPath}`);
  console.log(`→ Environnement : ${targetEnv} (${supabaseUrl})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
