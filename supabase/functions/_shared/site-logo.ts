type SupabaseAdmin = {
  from: (table: string) => Record<string, unknown>;
};

export type PdfSiteLogo = {
  dataUrl: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
};

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 24 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16, false), height: view.getUint32(20, false) };
}

function readJpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) break;
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (length < 2) break;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const height = (bytes[offset + 5] << 8) + bytes[offset + 6];
      const width = (bytes[offset + 7] << 8) + bytes[offset + 8];
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    offset += length + 2;
  }
  return null;
}

function imageFormatFromUrl(url: string, contentType: string): "PNG" | "JPEG" | null {
  const lower = url.toLowerCase();
  if (contentType.includes("png") || lower.includes(".png")) return "PNG";
  if (contentType.includes("jpeg") || contentType.includes("jpg") || lower.includes(".jpg") || lower.includes(".jpeg")) {
    return "JPEG";
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function resolveSiteLogoUrl(
  supabaseAdmin: SupabaseAdmin,
  siteId: string | null | undefined,
): Promise<string | null> {
  let resolvedSiteId = siteId?.trim() || null;

  if (!resolvedSiteId) {
    const slug = (Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois").trim();
    const { data: site } = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    resolvedSiteId = (site?.id as string | undefined) ?? null;
  }

  if (!resolvedSiteId) return null;

  const { data: asset } = await supabaseAdmin
    .from("site_assets")
    .select("url")
    .eq("site_id", resolvedSiteId)
    .eq("type", "logo")
    .eq("is_selected", true)
    .maybeSingle();

  if (typeof asset?.url === "string" && asset.url.trim()) {
    return asset.url.trim();
  }

  const { data: theme } = await supabaseAdmin
    .from("site_themes")
    .select("logo_url")
    .eq("site_id", resolvedSiteId)
    .eq("is_active", true)
    .maybeSingle();

  const logoUrl = theme?.logo_url;
  return typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;
}

export async function loadSiteLogoForPdf(logoUrl: string | null | undefined): Promise<PdfSiteLogo | null> {
  const url = logoUrl?.trim();
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const contentType = response.headers.get("content-type") || "";
    const format = imageFormatFromUrl(url, contentType);
    if (!format) return null;

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0) return null;

    const dimensions = format === "PNG"
      ? readPngDimensions(bytes)
      : readJpegDimensions(bytes);

    const base64 = bytesToBase64(bytes);
    const mime = format === "PNG" ? "image/png" : "image/jpeg";

    return {
      dataUrl: `data:${mime};base64,${base64}`,
      format,
      width: dimensions?.width ?? 400,
      height: dimensions?.height ?? 120,
    };
  } catch {
    return null;
  }
}

export async function loadSiteLogoForOrderPdf(
  supabaseAdmin: SupabaseAdmin,
  siteId: string | null | undefined,
): Promise<PdfSiteLogo | null> {
  const logoUrl = await resolveSiteLogoUrl(supabaseAdmin, siteId);
  return loadSiteLogoForPdf(logoUrl);
}
