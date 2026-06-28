/** Slug du site courant (sessionStorage). Préférer `useStorefrontSite().siteSlug`. */
export {
  DEFAULT_STOREFRONT_SITE_SLUG,
  readStoredSiteSlug,
} from "@/lib/storefrontSite";

import { readStoredSiteSlug } from "@/lib/storefrontSite";

/** @deprecated Utiliser `useStorefrontSite().siteSlug` */
export function getSiteSlug(): string {
  return readStoredSiteSlug();
}
