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
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});
