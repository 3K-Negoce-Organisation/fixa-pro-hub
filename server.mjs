import http from "http";
import sirv from "sirv";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "dist");

// Sert dist/ + fallback SPA (React Router)
const serve = sirv(DIST_DIR, {
  single: true,         // fallback /index.html
  etag: true,
  gzip: true,
  maxAge: 31536000,     // cache assets (sirv gère bien /assets)
  immutable: true,
});

function isRailwayAppHost(host = "") {
  return host.endsWith(".railway.app");
}

function canonicalHost(host = "") {
  // On ne canonicalise PAS le domaine Railway, uniquement tes domaines
  if (isRailwayAppHost(host)) return host;
  return "www.vis-a-bois.com";
}

const server = http.createServer((req, res) => {
  const host = req.headers.host || "";
  const proto = req.headers["x-forwarded-proto"] || "http";

  // 🛡️ Headers sécurité (optionnel)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // ✅ Canonicalisation: uniquement pour tes domaines (pas railway.app)
  const targetHost = canonicalHost(host);
  const needsHttps = proto !== "https";
  const needsHost = host !== targetHost;

  if (!isRailwayAppHost(host) && (needsHttps || needsHost)) {
    res.statusCode = 301;
    res.setHeader("Location", `https://${targetHost}${req.url}`);
    res.end();
    return;
  }

  // ✅ Servir l'app (SPA)
  serve(req, res);
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("Serving static files from", DIST_DIR);
});
