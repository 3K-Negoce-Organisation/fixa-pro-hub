import { createServer } from "http";
import handler from "serve-handler";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 8080;

// 🔑 Chemin absolu vers dist/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.join(__dirname, "dist");

const server = createServer((req, res) => {
  const host = req.headers.host;
  const proto = req.headers["x-forwarded-proto"];

  // 🔐 Force HTTPS + www
  if (proto !== "https" || host !== "www.vis-a-bois.com") {
    res.writeHead(301, {
      Location: `https://www.vis-a-bois.com${req.url}`,
    });
    res.end();
    return;
  }

  // 🛡️ Headers sécurité
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // 🚀 Cache long assets Vite
  if (req.url.startsWith("/assets/")) {
    res.setHeader(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  // ⚛️ SPA React Router
  return handler(req, res, {
    public: DIST_DIR,
    rewrites: [{ source: "**", destination: "/index.html" }],
  });
});

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
  console.log("Serving static files from", DIST_DIR);
});
