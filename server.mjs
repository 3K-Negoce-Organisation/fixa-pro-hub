import http from "http";
import sirv from "sirv";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "dist");

const serve = sirv(DIST_DIR, {
  single: true,   // SPA fallback -> index.html
  etag: true,
  gzip: true,
});

function isRailwayHost(host = "") {
  return host.endsWith(".railway.app");
}

const server = http.createServer((req, res) => {
  const host = req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "http";

  // 🔐 Canonicalisation : HTTPS + www (SAUF railway.app)
  if (!isRailwayHost(host) && (proto !== "https" || host !== "www.vis-a-bois.com")) {
    res.writeHead(301, {
      Location: `https://www.vis-a-bois.com${req.url}`,
    });
    res.end();
    return;
  }

  // Headers sécurité
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  serve(req, res);
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("Serving", DIST_DIR);
});
