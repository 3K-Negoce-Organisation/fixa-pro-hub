import { storefrontBrandForSlug } from "./storefront-url.ts";

/** Domaine vérifié Resend prod (voir AI-WORKSPACE-CONTEXT.md). */
const VERIFIED_FROM_EMAIL = "noreply@mail.vis-a-bois.com";

export function resolveResendFrom(
  settings?: {
    name?: string | null;
    customer_service_email?: string | null;
    email?: string | null;
  },
  opts?: { siteSlug?: string | null },
): { fromEmail: string; fromName: string; replyTo?: string } {
  const fromName = storefrontBrandForSlug(opts?.siteSlug);
  const replyTo = (settings?.customer_service_email || settings?.email || "").trim() || undefined;
  const fromEmail = (Deno.env.get("RESEND_FROM_EMAIL") || VERIFIED_FROM_EMAIL).trim();
  return { fromEmail, fromName, replyTo };
}
