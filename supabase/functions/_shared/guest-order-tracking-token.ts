/** Paramètre URL du jeton de suivi invité (HMAC order + email). */
export const GUEST_TRACKING_TOKEN_PARAM = "t";

function trackingSecret(): string {
  const secret =
    Deno.env.get("ORDER_TRACKING_SECRET")?.trim() ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!secret) {
    throw new Error("ORDER_TRACKING_SECRET is not configured");
  }
  return secret;
}

function payload(orderNumber: string, email: string): string {
  return `${orderNumber.trim().toUpperCase()}|${email.trim().toLowerCase()}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export async function signGuestOrderTrackingToken(
  orderNumber: string,
  email: string,
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(trackingSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
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
  const trimmed = (token ?? "").trim();
  if (!trimmed) return false;
  try {
    const expected = await signGuestOrderTrackingToken(orderNumber, email);
    return timingSafeEqual(expected, trimmed);
  } catch {
    return false;
  }
}
