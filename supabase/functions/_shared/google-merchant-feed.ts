export const GOOGLE_MERCHANT_SITE_URL = "https://www.3k-negoce.com";
/** Hardware > Hardware Accessories > Fasteners */
export const GOOGLE_PRODUCT_CATEGORY = "1732";
/** Marque fabricant (GTIN Alsafix). Le compte Merchant Center est 3K-Négoce. */
export const GOOGLE_MERCHANT_BRAND = "Alsafix";
export const GOOGLE_MERCHANT_COUNTRY = "FR";
export const GOOGLE_MERCHANT_LANGUAGE = "fr";
export const FREE_SHIPPING_THRESHOLD_TTC = 150;
export const DEFAULT_SHIPPING_FEE_TTC = 12;
export const MERCHANT_IMAGE_PREFIX = "/merchant-images/";

export type MerchantFeedProduct = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  designation_fr: string | null;
  price_ttc: number;
  price_ht: number;
  promo_price_ht: number | null;
  is_promo: boolean | null;
  stock: number | null;
  images: unknown;
  ean: string | null;
  code_alsafix: string | null;
  material: string | null;
  is_active: boolean | null;
  specifications?: unknown;
  category_product?: { name?: string | null } | { name?: string | null }[] | null;
  sub_category?: { name?: string | null } | { name?: string | null }[] | null;
};

export type MerchantFeedRow = Record<string, string>;

export const FEED_HEADERS = [
  "id",
  "title",
  "description",
  "link",
  "image_link",
  "additional_image_link",
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
  "shipping",
] as const;

function stripText(value: string | null | undefined, maxLength: number): string {
  const plain = (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength - 1)}…`;
}

function imageUrls(images: unknown): string[] {
  if (!Array.isArray(images) || images.length === 0) return [];
  const out: string[] = [];
  for (const item of images) {
    if (typeof item === "string" && item.startsWith("http")) out.push(item);
    else if (item && typeof item === "object" && "url" in item) {
      const url = (item as { url?: string }).url;
      if (url && url.startsWith("http")) out.push(url);
    }
  }
  return out;
}

function formatPrice(amount: number): string {
  return `${amount.toFixed(2)} EUR`;
}

function normalizeGtin(ean: string | null | undefined): string | null {
  if (!ean) return null;
  const digits = ean.replace(/\D/g, "");
  if (digits.length === 8 || digits.length === 12 || digits.length === 13 || digits.length === 14) {
    return digits;
  }
  return null;
}

function joinedName(
  value: { name?: string | null } | { name?: string | null }[] | null | undefined,
): string {
  if (!value) return "";
  if (Array.isArray(value)) return String(value[0]?.name ?? "").trim();
  return String(value.name ?? "").trim();
}

function resolveBrand(product: MerchantFeedProduct): string {
  const spec = product.specifications;
  let brand = GOOGLE_MERCHANT_BRAND;
  if (spec && typeof spec === "object" && !Array.isArray(spec)) {
    const rec = spec as { brand?: string; marque?: string };
    const fromSpec = String(rec.brand || rec.marque || "").trim();
    if (fromSpec) brand = fromSpec;
  }
  if (brand.toUpperCase() === "ALSAFIX") return GOOGLE_MERCHANT_BRAND;
  return brand;
}

export function toMerchantImageLink(imageUrl: string, siteUrl = GOOGLE_MERCHANT_SITE_URL): string {
  try {
    const parsed = new URL(imageUrl);
    if (!parsed.hostname.endsWith(".supabase.co")) return imageUrl;
    const match = parsed.pathname.match(/^\/storage\/v1\/object\/public\/(product-images\/.+)$/);
    if (!match) return imageUrl;
    return `${siteUrl.replace(/\/$/, "")}${MERCHANT_IMAGE_PREFIX}${match[1]}`;
  } catch {
    return imageUrl;
  }
}

export function buildMerchantFeedRow(product: MerchantFeedProduct): MerchantFeedRow | null {
  if (product.is_active === false) return null;

  const urls = imageUrls(product.images);
  if (urls.length === 0) return null;

  const description = stripText(
    product.description || product.designation_fr || product.title,
    5000,
  );
  if (!description) return null;

  const handle = product.handle?.trim();
  if (!handle) return null;

  const gtin = normalizeGtin(product.ean);
  const mpn = product.code_alsafix?.trim() || product.id;
  const stock = product.stock ?? 0;
  const priceTtc = Number(product.price_ttc);
  if (!Number.isFinite(priceTtc) || priceTtc <= 0) return null;

  const promoPriceHt = product.is_promo && product.promo_price_ht != null
    ? Number(product.promo_price_ht) * 1.2
    : null;
  const salePrice =
    promoPriceHt != null && promoPriceHt > 0 && promoPriceHt < priceTtc
      ? formatPrice(promoPriceHt)
      : "";
  const shippingFee = priceTtc >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : DEFAULT_SHIPPING_FEE_TTC;

  const row: MerchantFeedRow = {
    id: product.code_alsafix?.trim() || product.id,
    title: stripText(product.title, 150),
    description,
    link: `${GOOGLE_MERCHANT_SITE_URL}/produit/${encodeURIComponent(handle)}`,
    image_link: toMerchantImageLink(urls[0]),
    additional_image_link: urls.slice(1, 11).map((url) => toMerchantImageLink(url)).join(","),
    availability: stock > 0 ? "in_stock" : "out_of_stock",
    price: formatPrice(priceTtc),
    sale_price: salePrice,
    brand: resolveBrand(product),
    gtin: gtin ?? "",
    mpn,
    condition: "new",
    google_product_category: GOOGLE_PRODUCT_CATEGORY,
    product_type: stripText(
      joinedName(product.sub_category) || joinedName(product.category_product) || product.material || "",
      750,
    ),
    identifier_exists: gtin ? "TRUE" : "FALSE",
    shipping: `FR:::${shippingFee.toFixed(2)} EUR`,
  };

  return row;
}

export function buildMerchantFeedTsv(products: MerchantFeedProduct[]): string {
  const rows: MerchantFeedRow[] = [];
  for (const product of products) {
    const row = buildMerchantFeedRow(product);
    if (row) rows.push(row);
  }

  const escape = (value: string) => {
    if (/[\t"\n\r]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines = [
    FEED_HEADERS.join("\t"),
    ...rows.map((row) => FEED_HEADERS.map((header) => escape(row[header] ?? "")).join("\t")),
  ];
  return `${lines.join("\n")}\n`;
}

export function merchantFeedHeaders(): readonly string[] {
  return FEED_HEADERS;
}
