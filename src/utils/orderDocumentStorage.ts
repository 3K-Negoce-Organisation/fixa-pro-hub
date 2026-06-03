import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_DOCUMENTS_BUCKET = "order-documents";

/** Extrait le chemin relatif dans le bucket à partir d'un path ou d'une URL Supabase Storage. */
export function parseOrderDocumentStoragePath(
  pathOrUrl: string,
  bucket = ORDER_DOCUMENTS_BUCKET,
): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("://")) {
    return trimmed.replace(/^\/+/, "");
  }

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(
      /\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/,
    );
    if (!match) return null;
    const [, , encodedPath] = match;
    return decodeURIComponent(encodedPath);
  } catch {
    return null;
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

/** URL utilisable pour l'aperçu PDF (signed ou public). */
export async function resolveOrderDocumentPreviewUrl(
  supabase: SupabaseClient,
  doc: { path?: string; url?: string },
): Promise<string | null> {
  const raw = doc.path?.trim() || doc.url?.trim();
  if (!raw) return null;

  const storagePath = parseOrderDocumentStoragePath(raw);
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from(ORDER_DOCUMENTS_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (!error && data?.signedUrl) return data.signedUrl;

    const { data: publicData } = supabase.storage
      .from(ORDER_DOCUMENTS_BUCKET)
      .getPublicUrl(storagePath);
    if (publicData?.publicUrl) return publicData.publicUrl;
  }

  if (isHttpUrl(raw)) return raw;

  return null;
}

/** Télécharge le blob depuis le storage courant ou via l'URL enregistrée. */
export async function downloadOrderDocumentBlob(
  supabase: SupabaseClient,
  doc: { path?: string; url?: string },
): Promise<Blob | null> {
  const raw = doc.path?.trim() || doc.url?.trim();
  if (!raw) return null;

  const storagePath = parseOrderDocumentStoragePath(raw);
  if (storagePath) {
    const { data, error } = await supabase.storage
      .from(ORDER_DOCUMENTS_BUCKET)
      .download(storagePath);
    if (!error && data) return data;
  }

  if (isHttpUrl(raw)) {
    const response = await fetch(raw);
    if (response.ok) return response.blob();
  }

  return null;
}
