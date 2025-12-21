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
