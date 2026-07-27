import {
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TITLE,
  SITE_NAME,
} from "./seo-data.mjs";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Injecte title, description, canonical et Open Graph dans index.html
 * pour que les crawlers (GSC) voient les bonnes balises avant exécution JS.
 * Optionnel (GEO) : jsonLd dans <head>, crawlHtml en <noscript> — n'impacte pas React.
 */
export function injectSeoIntoHtml(html, seo = {}) {
  const title = seo.title ?? DEFAULT_TITLE;
  const description = seo.description ?? DEFAULT_DESCRIPTION;
  const canonical = seo.canonical ?? "https://www.vis-a-bois.com/";
  const ogImage = seo.ogImage ?? DEFAULT_OG_IMAGE;
  const noindex = Boolean(seo.noindex);

  let out = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`);

  out = out.replace(/\s*<meta name="description"[^>]*>/gi, "");
  out = out.replace(/\s*<link rel="canonical"[^>]*>/gi, "");
  out = out.replace(/\s*<meta name="robots"[^>]*>/gi, "");
  out = out.replace(/\s*<meta property="og:[^"]+"[^>]*>/gi, "");
  out = out.replace(/\s*<meta name="twitter:(?!site)[^"]+"[^>]*>/gi, "");
  // Retire d'éventuels JSON-LD / noscript GEO déjà injectés (évite doublons si template cache)
  out = out.replace(/\s*<script type="application\/ld\+json">[\s\S]*?<\/script>/gi, "");
  out = out.replace(/\s*<noscript id="geo-crawl-content">[\s\S]*?<\/noscript>/gi, "");

  const tags = [
    `<meta name="description" content="${escapeAttr(description)}" />`,
    `<link rel="canonical" href="${escapeAttr(canonical)}" />`,
    `<meta property="og:title" content="${escapeAttr(title)}" />`,
    `<meta property="og:description" content="${escapeAttr(description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeAttr(canonical)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:site_name" content="${escapeAttr(SITE_NAME)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@visabois" />`,
    `<meta name="twitter:title" content="${escapeAttr(title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(description)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ];

  if (noindex) {
    tags.push(`<meta name="robots" content="noindex, nofollow" />`);
  }

  const jsonLdItems = Array.isArray(seo.jsonLd)
    ? seo.jsonLd
    : seo.jsonLd
      ? [seo.jsonLd]
      : [];
  for (const item of jsonLdItems) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, "\\u003c")}</script>`,
    );
  }

  out = out.replace("</head>", `    ${tags.join("\n    ")}\n  </head>`);

  if (seo.crawlHtml && typeof seo.crawlHtml === "string" && seo.crawlHtml.trim()) {
    const noscript = `<noscript id="geo-crawl-content">${seo.crawlHtml}</noscript>`;
    out = out.replace(/<div id="root"><\/div>/i, `${noscript}\n    <div id="root"></div>`);
  }

  return out;
}
