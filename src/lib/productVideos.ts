/**
 * Vidéos produit YouTube (colonne products.videos).
 * Format JSON : [{ "url": "…", "provider": "youtube", "id": "…" }]
 */

export type ProductVideo = {
  url: string;
  provider: "youtube";
  id: string;
};

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

/** Extrait l’ID YouTube (11 caractères) depuis watch / youtu.be / embed / shorts. */
export function parseYoutubeVideoId(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;

  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes("://") ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  if (!YOUTUBE_HOSTS.has(host)) return null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  const v = url.searchParams.get("v");
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") {
    const id = parts[1] ?? "";
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }

  return null;
}

export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}`;
}

export function youtubeThumbUrl(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function normalizeProductVideo(input: string): ProductVideo | null {
  const id = parseYoutubeVideoId(input);
  if (!id) return null;
  return {
    url: youtubeWatchUrl(id),
    provider: "youtube",
    id,
  };
}

export function normalizeProductVideos(
  videos: ProductVideo[] | Array<{ url?: string }> | string[] | null | undefined,
): ProductVideo[] {
  if (!Array.isArray(videos)) return [];
  const out: ProductVideo[] = [];
  const seen = new Set<string>();
  for (const item of videos) {
    const raw = typeof item === "string" ? item : String(item?.url ?? "");
    const video = normalizeProductVideo(raw);
    if (!video || seen.has(video.id)) continue;
    seen.add(video.id);
    out.push(video);
  }
  return out;
}
