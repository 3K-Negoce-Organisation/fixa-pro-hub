type SupabaseAdmin = {
  from: (table: string) => Record<string, unknown>;
  storage: {
    from: (bucket: string) => {
      download: (path: string) => Promise<{ data: Blob | null; error: { message: string } | null }>;
    };
  };
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

function detectImageFormat(bytes: Uint8Array): "PNG" | "JPEG" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "PNG";
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    return "JPEG";
  }
  return null;
}

function isWebp(bytes: Uint8Array): boolean {
  return bytes.length >= 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function buildPdfSiteLogo(
  bytes: Uint8Array,
  format: "PNG" | "JPEG",
  dimensions?: { width: number; height: number } | null,
): PdfSiteLogo {
  const mime = format === "PNG" ? "image/png" : "image/jpeg";
  return {
    dataUrl: `data:${mime};base64,${bytesToBase64(bytes)}`,
    format,
    width: dimensions?.width ?? 400,
    height: dimensions?.height ?? 120,
  };
}

async function convertWebpToPng(bytes: Uint8Array): Promise<PdfSiteLogo | null> {
  try {
    const { decode } = await import("https://deno.land/x/imagescript@1.3.0/mod.ts");
    const image = await decode(bytes);
    const pngBytes = await image.encode(1);
    return buildPdfSiteLogo(pngBytes, "PNG", { width: image.width, height: image.height });
  } catch {
    return null;
  }
}

function toSupabaseRenderJpegUrl(url: string): string | null {
  const objectPublic = "/storage/v1/object/public/";
  const renderPublic = "/storage/v1/render/image/public/";
  if (!url.includes(objectPublic)) return null;
  const transformed = url.replace(objectPublic, renderPublic);
  const separator = transformed.includes("?") ? "&" : "?";
  return `${transformed}${separator}width=800&height=300&resize=contain&format=jpeg`;
}

function extractStoragePublicPath(url: string, bucket: string): string | null {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;
  const pathWithQuery = url.slice(index + marker.length);
  return pathWithQuery.split("?")[0] || null;
}

async function loadLogoBytesFromCandidates(urls: string[]): Promise<Uint8Array | null> {
  for (const candidate of urls) {
    try {
      const response = await fetch(candidate);
      if (!response.ok) continue;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 0) return bytes;
    } catch {
      // Essayer l'URL suivante
    }
  }
  return null;
}

async function loadSiteLogoFromBytes(bytes: Uint8Array): Promise<PdfSiteLogo | null> {
  const format = detectImageFormat(bytes);
  if (format) {
    const dimensions = format === "PNG" ? readPngDimensions(bytes) : readJpegDimensions(bytes);
    return buildPdfSiteLogo(bytes, format, dimensions);
  }
  if (isWebp(bytes)) {
    return convertWebpToPng(bytes);
  }
  return null;
}

export async function resolveSiteLogoUrl(
  supabaseAdmin: SupabaseAdmin,
  siteId: string | null | undefined,
): Promise<string | null> {
  let resolvedSiteId = siteId?.trim() || null;

  if (!resolvedSiteId) {
    const slug = (Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois").trim();
    const siteQuery = await supabaseAdmin
      .from("sites")
      .select("id")
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle() as { data: { id?: string } | null };
    resolvedSiteId = siteQuery.data?.id ?? null;
  }

  if (!resolvedSiteId) return null;

  const selectedAssetQuery = await supabaseAdmin
    .from("site_assets")
    .select("url")
    .eq("site_id", resolvedSiteId)
    .eq("type", "logo")
    .eq("is_selected", true)
    .maybeSingle() as { data: { url?: string } | null };

  if (typeof selectedAssetQuery.data?.url === "string" && selectedAssetQuery.data.url.trim()) {
    return selectedAssetQuery.data.url.trim();
  }

  const latestAssetQuery = await supabaseAdmin
    .from("site_assets")
    .select("url")
    .eq("site_id", resolvedSiteId)
    .eq("type", "logo")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle() as { data: { url?: string } | null };

  if (typeof latestAssetQuery.data?.url === "string" && latestAssetQuery.data.url.trim()) {
    return latestAssetQuery.data.url.trim();
  }

  const themeQuery = await supabaseAdmin
    .from("site_themes")
    .select("logo_url")
    .eq("site_id", resolvedSiteId)
    .eq("is_active", true)
    .maybeSingle() as { data: { logo_url?: string | null } | null };

  const logoUrl = themeQuery.data?.logo_url;
  return typeof logoUrl === "string" && logoUrl.trim() ? logoUrl.trim() : null;
}

export async function loadSiteLogoForPdf(logoUrl: string | null | undefined): Promise<PdfSiteLogo | null> {
  const url = logoUrl?.trim();
  if (!url) return null;

  const candidates = [url];
  const renderUrl = toSupabaseRenderJpegUrl(url);
  if (renderUrl) candidates.unshift(renderUrl);

  const bytes = await loadLogoBytesFromCandidates(candidates);
  if (bytes) {
    return loadSiteLogoFromBytes(bytes);
  }

  return null;
}

/** URL publique du logo, rendue JPEG si stockée en WebP (compatibilité clients mail). */
export async function resolveSiteLogoUrlForEmail(
  supabaseAdmin: SupabaseAdmin,
  siteId: string | null | undefined,
): Promise<string | null> {
  const logoUrl = await resolveSiteLogoUrl(supabaseAdmin, siteId);
  if (!logoUrl) return null;
  const renderUrl = toSupabaseRenderJpegUrl(logoUrl);
  return renderUrl || logoUrl;
}

export async function loadSiteLogoForOrderPdf(
  supabaseAdmin: SupabaseAdmin,
  siteId: string | null | undefined,
): Promise<PdfSiteLogo | null> {
  const logoUrl = await resolveSiteLogoUrl(supabaseAdmin, siteId);
  if (logoUrl) {
    const fromUrl = await loadSiteLogoForPdf(logoUrl);
    if (fromUrl) return fromUrl;
  }

  if (!logoUrl) return null;

  const storagePath = extractStoragePublicPath(logoUrl, "site-logos");
  if (!storagePath) return null;

  try {
    const { data, error } = await supabaseAdmin.storage.from("site-logos").download(storagePath);
    if (error || !data) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    return loadSiteLogoFromBytes(bytes);
  } catch {
    return null;
  }
}
