import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT || 8080);
const DEFAULT_SITE = "vis-a-bois";

function normalizeSiteSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function siteSelectHtml(slug: string): string {
  const safe = JSON.stringify(slug);
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Chargement…</title></head><body><script>
sessionStorage.setItem("storefront_site_slug", ${safe});
location.replace("/");
</script></body></html>`;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseSiteFromBody(body: string, contentType: string): string | null {
  const ct = contentType.toLowerCase();
  if (ct.includes("application/json")) {
    try {
      const json = JSON.parse(body) as { site?: string };
      return json.site?.trim() || null;
    } catch {
      return null;
    }
  }
  const params = new URLSearchParams(body);
  return params.get("site")?.trim() || null;
}

const MIME: Record<string, string> = {
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

function sendFile(res: http.ServerResponse, filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  res.writeHead(200, { "Content-Type": type });
  fs.createReadStream(filePath).pipe(res);
}

function resolveFile(urlPath: string): string | null {
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(DIST, safePath);
  if (!candidate.startsWith(DIST)) return null;
  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  return null;
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
    let file = resolveFile(url.pathname);
    if (!file) {
      file = path.join(DIST, "index.html");
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
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
