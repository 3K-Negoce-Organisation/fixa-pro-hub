import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { resolveResendFrom } from "./resolve-resend-from.ts";

const ENV_KEYS = [
  "RESEND_FROM_EMAIL",
  "RESEND_FROM_EMAIL_3K",
  "RESEND_FROM_EMAIL_VAB",
  "STOREFRONT_BRAND_NAME",
  "STOREFRONT_BRAND_NAME_3K",
  "STOREFRONT_BRAND_NAME_VIS",
];

const SAV = {
  customer_service_email: "sav@fournisseur.example",
  email: "contact@fournisseur.example",
};

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    previous.set(key, Deno.env.get(key));
    Deno.env.delete(key);
  }
  for (const [key, value] of Object.entries(values)) {
    if (value != null) Deno.env.set(key, value);
  }
  try {
    fn();
  } finally {
    for (const [key, value] of previous) {
      if (value == null) Deno.env.delete(key);
      else Deno.env.set(key, value);
    }
  }
}

Deno.test("slug 3k-negoce → expéditeur 3K-Négoce", () => {
  withEnv(
    { RESEND_FROM_EMAIL_3K: "3K-Négoce <noreply@mail.3k-negoce.com>" },
    () => {
      const from = resolveResendFrom(SAV, { siteSlug: "3k-negoce" });
      assertEquals(from.fromName, "3K-Négoce");
      assertEquals(from.fromEmail, "noreply@mail.3k-negoce.com");
      assertEquals(`${from.fromName} <${from.fromEmail}>`, "3K-Négoce <noreply@mail.3k-negoce.com>");
      assertEquals(from.replyTo, "sav@fournisseur.example");
    },
  );
});

Deno.test("slug vis-a-bois → expéditeur Vis-à-Bois", () => {
  withEnv(
    { RESEND_FROM_EMAIL_VAB: "Vis-à-Bois <noreply@mail.vis-a-bois.com>" },
    () => {
      const from = resolveResendFrom(SAV, { siteSlug: "vis-a-bois" });
      assertEquals(from.fromName, "Vis-à-Bois");
      assertEquals(from.fromEmail, "noreply@mail.vis-a-bois.com");
      assertEquals(`${from.fromName} <${from.fromEmail}>`, "Vis-à-Bois <noreply@mail.vis-a-bois.com>");
      assertEquals(from.replyTo, "sav@fournisseur.example");
    },
  );
});

Deno.test("secrets de site absents → repli RESEND_FROM_EMAIL puis adresse actuelle", () => {
  withEnv({}, () => {
    for (const siteSlug of ["3k-negoce", "vis-a-bois", null]) {
      const from = resolveResendFrom(SAV, { siteSlug });
      assertEquals(from.fromEmail, "noreply@mail.vis-a-bois.com");
      assertEquals(from.replyTo, "sav@fournisseur.example");
    }
    assertEquals(resolveResendFrom(SAV, { siteSlug: "3k-negoce" }).fromName, "3K-Négoce");
    assertEquals(resolveResendFrom(SAV, { siteSlug: "vis-a-bois" }).fromName, "Vis-à-Bois");
  });

  withEnv({ RESEND_FROM_EMAIL: "noreply@mail.vis-a-bois.com" }, () => {
    const from = resolveResendFrom(SAV, { siteSlug: "3k-negoce" });
    assertEquals(from.fromEmail, "noreply@mail.vis-a-bois.com");
    assertEquals(from.fromName, "3K-Négoce");
    assertEquals(from.replyTo, "sav@fournisseur.example");
  });
});

Deno.test("le secret d’un site ne s’applique pas à l’autre", () => {
  withEnv(
    { RESEND_FROM_EMAIL_3K: "3K-Négoce <noreply@mail.3k-negoce.com>" },
    () => {
      const from = resolveResendFrom(SAV, { siteSlug: "vis-a-bois" });
      assertEquals(from.fromEmail, "noreply@mail.vis-a-bois.com");
      assertEquals(from.fromName, "Vis-à-Bois");
    },
  );
});
