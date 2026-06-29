import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_HOST,
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  NOINDEX_PATH_PREFIXES,
  REDIRECT_HOSTS,
  SITE_URL,
  absoluteUrl,
  manifestKey,
  toManifestEntry,
} from "./seo-data.mjs";
import { injectSeoIntoHtml } from "./html-seo-inject.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT || 8080);
const DEFAULT_SITE = "vis-a-bois";

let seoManifest = {};
const manifestPath = path.join(DIST, "seo-manifest.json");
if (fs.existsSync(manifestPath)) {
  try {
    seoManifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    console.log(`[storefront-server] seo-manifest: ${Object.keys(seoManifest).length} entrées`);
  } catch (err) {
    console.warn("[storefront-server] seo-manifest illisible:", err.message);
  }
} else {
  console.warn("[storefront-server] seo-manifest.json absent — meta par défaut sur index.html");
}

let indexHtmlTemplate = null;
const indexPath = path.join(DIST, "index.html");

function getIndexHtmlTemplate() {
  if (indexHtmlTemplate) return indexHtmlTemplate;
  if (!fs.existsSync(indexPath)) return null;
  indexHtmlTemplate = fs.readFileSync(indexPath, "utf8");
  return indexHtmlTemplate;
}

function isNoindexPath(pathname) {
  return NOINDEX_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function resolveSeoForRequest(pathname, searchParams) {
  if (isNoindexPath(pathname)) {
    return toManifestEntry({
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      canonical: pathname,
      noindex: true,
    });
  }

  const key = manifestKey(pathname, searchParams);
  if (seoManifest[key]) return seoManifest[key];

  const productMatch = pathname.match(/^\/produit\/([^/]+)$/);
  if (productMatch) {
    const handle = decodeURIComponent(productMatch[1]);
    return toManifestEntry({
      title: `${handle} — Vis-à-Bois`,
      description: DEFAULT_DESCRIPTION,
      canonical: pathname,
    });
  }

  if (pathname === "/produits" && searchParams.get("q")) {
    const q = searchParams.get("q");
    return toManifestEntry({
      title: `Recherche « ${q} » — Vis à bois | Vis-à-Bois`,
      description: `Résultats pour « ${q} » dans notre catalogue de vis à bois. Livraison 24/48h.`,
      canonical: `/produits?q=${encodeURIComponent(q)}`,
    });
  }

  return null;
}

function maybeRedirectToCanonical(req, res, url) {
  const host = (req.headers.host || "").split(":")[0].toLowerCase();
  if (!host || host === CANONICAL_HOST || !REDIRECT_HOSTS.has(host)) return false;
  const target = `${SITE_URL}${url.pathname}${url.search}`;
  res.writeHead(301, { Location: target });
  res.end();
  return true;
}

function normalizeSiteSlug(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function siteSelectHtml(slug) {
  const safe = JSON.stringify(slug);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Chargement…</title></head><body><script>
sessionStorage.setItem("storefront_site_slug", ${safe});
location.replace("/");
</script></body></html>`;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseSiteFromBody(body, contentType) {
  const ct = contentType.toLowerCase();
  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(body);
      return json.site?.trim() || null;
    } catch {
      return null;
    }
  }
  const params = new URLSearchParams(body);
  return params.get("site")?.trim() || null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function sendFile(res, filePath, contentOverride = null) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  if (contentOverride != null) {
    res.end(contentOverride);
    return;
  }
  fs.createReadStream(filePath).pipe(res);
}

function resolveFile(urlPath) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(DIST, safePath);
  if (!candidate.startsWith(DIST)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
}

function serveSpaIndex(res, url) {
  const template = getIndexHtmlTemplate();
  if (!template) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
    return;
  }

  const seo = resolveSeoForRequest(url.pathname, url.searchParams);
  if (!seo) {
    const html = injectSeoIntoHtml(template, {
      title: "Page introuvable — Vis-à-Bois",
      description: DEFAULT_DESCRIPTION,
      canonical: absoluteUrl(url.pathname),
      noindex: true,
    });
    sendFile(res, indexPath, html);
    return;
  }

  const html = injectSeoIntoHtml(template, seo);
  sendFile(res, indexPath, html);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST") {
      const body = await readBody(req);
      const siteRaw =
        parseSiteFromBody(body, req.headers["content-type"] || "") ||
        new URL(req.url || "/", `http://${req.headers.host}`).searchParams.get("site");
      if (siteRaw) {
        const slug = normalizeSiteSlug(siteRaw) || DEFAULT_SITE;
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(siteSelectHtml(slug));
        return;
      }
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (maybeRedirectToCanonical(req, res, url)) return;

    let file = resolveFile(url.pathname);
    if (!file) {
      serveSpaIndex(res, url);
      return;
    }
    sendFile(res, file);
  } catch (err) {
    console.error("[storefront-server]", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => {
  console.log(`[storefront-server] listening on :${PORT}, dist=${DIST}`);
});
