export const GOOGLE_MERCHANT_SITE_URL = "https://www.vis-a-bois.com";
/** Hardware > Hardware Accessories > Fasteners */
export const GOOGLE_PRODUCT_CATEGORY = "1732";
export const GOOGLE_MERCHANT_BRAND = "Vis-à-Bois";
export const GOOGLE_MERCHANT_COUNTRY = "FR";
export const GOOGLE_MERCHANT_LANGUAGE = "fr";

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
  category: string | null;
  material: string | null;
  is_active: boolean | null;
};

export type MerchantFeedRow = Record<string, string>;

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
] as const;

function stripText(value: string | null | undefined, maxLength: number): string {
  const plain = (value ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!plain) return "";
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength - 1)}…`;
}

function firstImageUrl(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  if (typeof first === "string" && first.startsWith("http")) return first;
  if (first && typeof first === "object" && "url" in first) {
    const url = (first as { url?: string }).url;
    if (url && url.startsWith("http")) return url;
  }
  return null;
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

export function buildMerchantFeedRow(product: MerchantFeedProduct): MerchantFeedRow | null {
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
  const promoPriceHt = product.is_promo && product.promo_price_ht != null
    ? Number(product.promo_price_ht) * 1.2
    : null;

  const row: MerchantFeedRow = {
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
    identifier_exists: gtin ? "TRUE" : mpn ? "TRUE" : "FALSE",
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
