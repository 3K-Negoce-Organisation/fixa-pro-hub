/** Google Analytics 4 + Consent Mode v2 (EEA / RGPD). */

export type CookiePreferences = {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
};

export const COOKIE_CONSENT_KEY = "cookie_consent";
export const COOKIE_PREFERENCES_KEY = "cookie_preferences";

const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function ensureGtag(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

/** Consent Mode defaults denied — before any analytics cookies. */
export function initGaConsentDefaults(): void {
  if (!MEASUREMENT_ID) return;
  ensureGtag();
  window.gtag!("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "denied",
    wait_for_update: 500,
  });
}

/** Load gtag.js once and configure the GA4 property. */
export function loadGoogleAnalytics(): void {
  if (!MEASUREMENT_ID || typeof document === "undefined") return;
  if (document.getElementById("ga4-gtag")) return;

  ensureGtag();
  const script = document.createElement("script");
  script.id = "ga4-gtag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag!("js", new Date());
  window.gtag!("config", MEASUREMENT_ID, { anonymize_ip: true });
}

export function applyCookiePreferencesToGa(prefs: CookiePreferences): void {
  if (!MEASUREMENT_ID) return;
  ensureGtag();

  const analytics = prefs.analytics ? "granted" : "denied";
  const marketing = prefs.marketing ? "granted" : "denied";

  window.gtag!("consent", "update", {
    analytics_storage: analytics,
    ad_storage: marketing,
    ad_user_data: marketing,
    ad_personalization: marketing,
  });
}

export function readStoredCookiePreferences(): CookiePreferences | null {
  try {
    const raw = localStorage.getItem(COOKIE_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookiePreferences;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function isGaConfigured(): boolean {
  return Boolean(MEASUREMENT_ID);
}
