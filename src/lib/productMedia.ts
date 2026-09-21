/**
 * Médias carrousel fiche produit : images puis vidéos YouTube.
 */

import {
  normalizeProductVideos,
  type ProductVideo,
  youtubeEmbedUrl,
  youtubeThumbUrl,
} from "@/lib/productVideos";
import { resolveProductImageUrl } from "@/lib/imageFallback";

export type ProductCarouselImageItem = {
  kind: "image";
  url: string;
};

export type ProductCarouselVideoItem = {
  kind: "video";
  url: string;
  provider: "youtube";
  id: string;
  thumbUrl: string;
  embedUrl: string;
};

export type ProductCarouselItem = ProductCarouselImageItem | ProductCarouselVideoItem;

function normalizeImageUrls(
  images: Array<{ url?: string }> | string[] | null | undefined,
): string[] {
  if (!Array.isArray(images)) return [];
  const out: string[] = [];
  for (const img of images) {
    const raw = typeof img === "string" ? img.trim() : String(img?.url ?? "").trim();
    if (!raw) continue;
    out.push(resolveProductImageUrl(raw));
  }
  return out;
}

/** Ordre carrousel : images puis vidéos. */
export function productCarouselItems(
  images: Array<{ url?: string }> | string[] | null | undefined,
  videos: ProductVideo[] | Array<{ url?: string }> | string[] | null | undefined,
): ProductCarouselItem[] {
  const items: ProductCarouselItem[] = [];
  for (const url of normalizeImageUrls(images)) {
    items.push({ kind: "image", url });
  }
  for (const video of normalizeProductVideos(videos)) {
    items.push({
      kind: "video",
      url: video.url,
      provider: video.provider,
      id: video.id,
      thumbUrl: youtubeThumbUrl(video.id),
      embedUrl: youtubeEmbedUrl(video.id),
    });
  }
  return items;
}
