import { DEFAULT_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/seo";

/** Fiche Organisation / marque pour Knowledge Graph et citations IA. */
export function buildOrganizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    legalName: "3K-Négoce",
    url: SITE_URL,
    logo: absoluteUrl("/og-image.jpg"),
    description: DEFAULT_DESCRIPTION,
    email: "contact@vis-a-bois.com",
    telephone: "+33617912029",
    address: {
      "@type": "PostalAddress",
      streetAddress: "47 rue Vivienne",
      addressLocality: "Paris",
      postalCode: "75002",
      addressCountry: "FR",
    },
    vatID: "FR45102662483",
    foundingDate: "2024",
    sameAs: [SITE_URL],
    areaServed: {
      "@type": "Country",
      name: "France",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+33617912029",
      contactType: "customer service",
      availableLanguage: "French",
      areaServed: "FR",
    },
  };
}

export function buildWebsiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/produits?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}
