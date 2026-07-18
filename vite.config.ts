import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/** Refs Supabase à ne plus embarquer dans un build (DNS mort ou périmètre Luceka). Voir AI-WORKSPACE-CONTEXT.md. */
const DEPRECATED_SUPABASE_REFS_IN_URL = [
  "gcyxfuxywratoyjnxurf",
  "aueuxlqtueoqjxsdemeu",
  "giguuzfnjkkqdeteujwc",
];

function assertViteSupabaseUrlForBuild(command: string) {
  if (command !== "build") return;
  const url = process.env.VITE_SUPABASE_URL ?? "";
  const hit = DEPRECATED_SUPABASE_REFS_IN_URL.find((ref) => url.includes(ref));
  if (hit) {
    throw new Error(
      `[vite] VITE_SUPABASE_URL contient le ref obsolète "${hit}". Staging 3K = lhrwjnieojuempxjbgql ; prod = lqsbsinycyewdvdtbruy. Corriger les variables Railway / CI puis rebuild.`
    );
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode, command }) => {
  assertViteSupabaseUrlForBuild(command);
  return {
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    {
      name: "html-google-site-verification",
      transformIndexHtml(html: string) {
        const token = process.env.VITE_GOOGLE_SITE_VERIFICATION;
        if (!token) return html;
        return html.replace(
          "</head>",
          `    <meta name="google-site-verification" content="${token}" />\n  </head>`,
        );
      },
    },
    {
      // Early Consent Mode defaults in <head> (before React) when GA is configured.
      name: "html-ga-consent-default",
      transformIndexHtml(html: string) {
        const id = process.env.VITE_GA_MEASUREMENT_ID?.trim();
        if (!id) return html;
        const snippet = `    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        wait_for_update: 500
      });
    </script>
`;
        return html.replace("</head>", `${snippet}  </head>`);
      },
    },
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
