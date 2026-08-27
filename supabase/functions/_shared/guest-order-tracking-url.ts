import {
  GUEST_TRACKING_TOKEN_PARAM,
  signGuestOrderTrackingToken,
} from "./guest-order-tracking-token.ts";
import { storefrontUrlForSlug } from "./storefront-url.ts";

/** Lien suivi invité signé : order + email + jeton HMAC (non forgeable). */
export async function buildGuestOrderTrackingUrl(
  orderNumber: string,
  customerEmail: string,
  storefrontUrl?: string,
): Promise<string> {
  const base = (storefrontUrl || storefrontUrlForSlug(null)).replace(/\/$/, "");
  const order = orderNumber.trim().toUpperCase();
  const email = customerEmail.trim().toLowerCase();
  const token = await signGuestOrderTrackingToken(order, email);
  const params = new URLSearchParams({
    order,
    email,
    [GUEST_TRACKING_TOKEN_PARAM]: token,
  });
  return `${base}/suivi?${params.toString()}`;
}

/** Lien suivi dans les emails client — toujours signé. */
export async function buildOrderTrackingUrlForEmail(
  orderNumber: string,
  customerEmail: string,
  storefrontUrl?: string,
): Promise<string> {
  return buildGuestOrderTrackingUrl(orderNumber, customerEmail, storefrontUrl);
}
