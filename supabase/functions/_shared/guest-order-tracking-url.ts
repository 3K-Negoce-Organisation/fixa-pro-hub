/** Lien suivi invité : préremplit numéro + email sur /suivi */
export function buildGuestOrderTrackingUrl(
  orderNumber: string,
  customerEmail: string,
  storefrontUrl?: string,
): string {
  const base = (storefrontUrl || Deno.env.get("STOREFRONT_URL") || "https://www.vis-a-bois.com").replace(/\/$/, "");
  const params = new URLSearchParams({
    order: orderNumber.trim().toUpperCase(),
    email: customerEmail.trim().toLowerCase(),
  });
  return `${base}/suivi?${params.toString()}`;
}
