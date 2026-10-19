import { storefrontBrandForSlug } from "./storefront-url.ts";

/** Domaine vérifié Resend prod (voir AI-WORKSPACE-CONTEXT.md). */
const VERIFIED_FROM_EMAIL = "noreply@mail.vis-a-bois.com";

const FROM_SECRET_BY_SLUG: Record<string, string> = {
  "3k-negoce": "RESEND_FROM_EMAIL_3K",
  "vis-a-bois": "RESEND_FROM_EMAIL_VAB",
};

function readEnv(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

/** Secret = `Nom <email>` ou simple adresse. Le nom de marque reste le repli. */
function parseFromAddress(raw: string, fallbackName: string): { fromEmail: string; fromName: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>\s*$/);
  if (match) {
    const email = match[2].trim();
    const name = match[1].trim().replace(/^["']|["']$/g, "");
    if (email) return { fromEmail: email, fromName: name || fallbackName };
  }
  return { fromEmail: raw.trim(), fromName: fallbackName };
}

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
  const slug = (opts?.siteSlug || "").trim().toLowerCase();
  const siteSecretName = FROM_SECRET_BY_SLUG[slug];
  const siteSecret = siteSecretName ? readEnv(siteSecretName) : "";
  const raw = siteSecret || readEnv("RESEND_FROM_EMAIL") || VERIFIED_FROM_EMAIL;
  const parsed = parseFromAddress(raw, fromName);
  return { fromEmail: parsed.fromEmail, fromName: parsed.fromName, replyTo };
}
