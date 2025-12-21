import { createServer } from "http";
import handler from "serve-handler";

const PORT = 8080;

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
  
  // Headers de sécurité (optionnel mais recommandé)
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Cache long pour les assets Vite
  if (req.url.startsWith("/assets/")) {
    res.setHeader(
      "Cache-Control",
      "public, max-age=31536000, immutable"
    );
  }

  return handler(req, res, {
    public: "dist",
    rewrites: [
      { source: "**", destination: "/index.html" }, // React Router
    ],
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
