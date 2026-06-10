/** Paramètre URL du jeton de suivi invité (HMAC order + email). */
export const GUEST_TRACKING_TOKEN_PARAM = "t";

const TRACKING_KEY_SALT = "vis-a-bois-guest-tracking-v1";

function payload(orderNumber: string, email: string): string {
  return `${orderNumber.trim().toUpperCase()}|${email.trim().toLowerCase()}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array | null {
  try {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const padLen = (4 - (trimmed.length % 4)) % 4;
    const b64 = trimmed.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat(padLen);
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

/** Clé HMAC dérivée (stable, identique sur toutes les edge functions du projet). */
async function getTrackingHmacKey(): Promise<CryptoKey> {
  const explicit = Deno.env.get("ORDER_TRACKING_SECRET")?.trim();
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const material = explicit || (serviceRole ? `${TRACKING_KEY_SALT}:${serviceRole}` : "");
  if (!material) {
    throw new Error("Tracking secret not configured");
  }

  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signGuestOrderTrackingToken(
  orderNumber: string,
  email: string,
): Promise<string> {
  const key = await getTrackingHmacKey();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload(orderNumber, email)),
  );
  return base64UrlEncode(new Uint8Array(sig));
}

export async function verifyGuestOrderTrackingToken(
  orderNumber: string,
  email: string,
  token: string | null | undefined,
): Promise<boolean> {
  const sigBytes = base64UrlDecode((token ?? "").trim());
  if (!sigBytes) return false;

  try {
    const key = await getTrackingHmacKey();
    return await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(payload(orderNumber, email)),
    );
  } catch {
    return false;
  }
}
