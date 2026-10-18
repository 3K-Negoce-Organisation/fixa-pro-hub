/**
 * Résolution des clés API Supabase (legacy JWT + sb_publishable_ / sb_secret_).
 *
 * Pendant la transition les deux familles coexistent :
 * - SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY (chaînes, souvent encore injectées)
 * - SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS (JSON { "default": "sb_…" })
 *
 * Après désactivation des clés JWT, seul le JSON (ou un secret Edge
 * SUPABASE_SERVICE_ROLE_KEY = sb_secret_…) reste disponible.
 *
 * Toute modification de ce fichier redéploie toutes les Edge Functions (delta _shared).
 */

function parseNamedKeysJson(raw: string | undefined): Record<string, string> {
  const t = (raw ?? "").trim();
  if (!t) return {};
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

/** Toutes les clés secrètes connues (legacy + sb_secret_* nommées). */
export function listSupabaseSecretKeys(): string[] {
  const keys: string[] = [];
  const legacy = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (legacy) keys.push(legacy);
  for (const v of Object.values(parseNamedKeysJson(Deno.env.get("SUPABASE_SECRET_KEYS")))) {
    if (!keys.includes(v)) keys.push(v);
  }
  return keys;
}

/** Toutes les clés publishable / anon connues. */
export function listSupabasePublishableKeys(): string[] {
  const keys: string[] = [];
  const legacy = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  if (legacy) keys.push(legacy);
  for (const v of Object.values(parseNamedKeysJson(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")))) {
    if (!keys.includes(v)) keys.push(v);
  }
  return keys;
}

/**
 * Clé admin pour createClient (bypass RLS).
 *
 * Ordre :
 * 1. `SUPABASE_SECRET_KEY_NAME` (ex. `kpmc_2026`) si présent dans SUPABASE_SECRET_KEYS
 * 2. noms préférés : `kpmc_2026`, puis `default`
 * 3. `SUPABASE_SERVICE_ROLE_KEY` (legacy JWT ou secret Edge posé manuellement)
 * 4. première clé de SUPABASE_SECRET_KEYS
 */
export function getSupabaseServiceRoleKey(): string {
  const named = parseNamedKeysJson(Deno.env.get("SUPABASE_SECRET_KEYS"));
  const preferredName = (Deno.env.get("SUPABASE_SECRET_KEY_NAME") ?? "").trim();
  if (preferredName && named[preferredName]) return named[preferredName];
  for (const name of ["kpmc_2026", "default"]) {
    if (named[name]) return named[name];
  }
  const legacy = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (legacy) return legacy;
  const first = Object.values(named)[0];
  return first ?? "";
}

/**
 * Clé publique pour createClient user-scoped.
 * Préfère `default` dans SUPABASE_PUBLISHABLE_KEYS, sinon ANON, sinon première.
 */
export function getSupabaseAnonKey(): string {
  const named = parseNamedKeysJson(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"));
  if (named.default) return named.default;
  const legacy = (Deno.env.get("SUPABASE_ANON_KEY") ?? "").trim();
  if (legacy) return legacy;
  const first = Object.values(named)[0];
  return first ?? "";
}

/** Token brut (sans préfixe Bearer) = clé secrète ou JWT role=service_role. */
export function isServiceRoleToken(token: string): boolean {
  const t = token.trim();
  if (!t) return false;
  for (const sk of listSupabaseSecretKeys()) {
    if (t === sk) return true;
  }
  const parts = t.split(".");
  if (parts.length < 2) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.role === "service_role";
  } catch {
    return false;
  }
}

/** Header Authorization: Bearer … */
export function isServiceRoleBearer(authHeader: string | null): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  return isServiceRoleToken(authHeader.slice(7));
}

/** True si le token est une clé API (pas un JWT de session utilisateur). */
export function isApiKeyToken(token: string): boolean {
  const t = token.trim();
  if (!t) return false;
  if (t.startsWith("sb_")) return true;
  if (listSupabaseSecretKeys().includes(t)) return true;
  if (listSupabasePublishableKeys().includes(t)) return true;
  return false;
}
