/**
 * Résolution des clés API Supabase (legacy JWT + sb_publishable_ / sb_secret_).
 *
 * Pendant la transition les deux familles coexistent :
 * - SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY (chaînes, souvent encore injectées)
 * - SUPABASE_SECRET_KEYS / SUPABASE_PUBLISHABLE_KEYS (JSON { "default": "sb_…" })
 *
 * Après désactivation des clés JWT, seul le JSON (ou un secret Edge
 * SUPABASE_SERVICE_ROLE_KEY = sb_secret_…) reste disponible.
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

/** Comparaison en temps (quasi) constant — ne log jamais les valeurs. */
export function timingSafeEqualString(a: string, b: string): boolean {
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  const len = Math.max(ae.length, be.length);
  let mismatch = ae.length ^ be.length;
  for (let i = 0; i < len; i++) {
    mismatch |= (ae[i] ?? 0) ^ (be[i] ?? 0);
  }
  return mismatch === 0;
}

/**
 * Toutes les clés secrètes connues (legacy + sb_secret_* nommées).
 * `SUPABASE_SECRET_KEYS` défaut `"{}"` ; JSON objet `{ "default": "sb_secret_…" }`.
 * JSON invalide → aucune clé sb_secret_ (legacy conservée), pas de throw, rien loggé.
 * Valeurs non-string / vides ignorées.
 */
export function listSupabaseSecretKeysFrom(
  getEnv: (name: string) => string | undefined,
): string[] {
  const keys: string[] = [];
  const legacy = (getEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (legacy) keys.push(legacy);

  const rawSecretKeys = (getEnv("SUPABASE_SECRET_KEYS") ?? "{}").trim() || "{}";
  try {
    const parsed = JSON.parse(rawSecretKeys) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      for (const v of Object.values(parsed as Record<string, unknown>)) {
        if (typeof v !== "string") continue;
        const t = v.trim();
        if (!t || keys.includes(t)) continue;
        keys.push(t);
      }
    }
  } catch {
    // JSON invalide : aucune sb_secret_ ; legacy déjà ajoutée ; ne pas logger le contenu
  }
  return keys;
}

/** Toutes les clés secrètes connues (legacy + sb_secret_* nommées). */
export function listSupabaseSecretKeys(): string[] {
  return listSupabaseSecretKeysFrom((name) => Deno.env.get(name));
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
 * Préfère `default` dans SUPABASE_SECRET_KEYS, sinon legacy, sinon première clé.
 */
export function getSupabaseServiceRoleKey(): string {
  const named = parseNamedKeysJson(Deno.env.get("SUPABASE_SECRET_KEYS"));
  if (named.default) return named.default;
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

/**
 * Token brut (sans préfixe Bearer) = égalité temps-constant avec une clé de
 * `listSupabaseSecretKeys()` uniquement.
 * Pas de décodage JWT « role == service_role » (forgible si verify_jwt=false).
 */
export function isServiceRoleTokenFrom(
  token: string,
  allowedSecrets: readonly string[],
): boolean {
  const t = token.trim();
  if (!t) return false;
  let matched = false;
  for (const candidate of allowedSecrets) {
    const c = candidate.trim();
    if (!c) continue;
    if (timingSafeEqualString(t, c)) matched = true;
  }
  return matched;
}

/** Token brut = clé secrète serveur connue (voir `isServiceRoleTokenFrom`). */
export function isServiceRoleToken(token: string): boolean {
  return isServiceRoleTokenFrom(token, listSupabaseSecretKeys());
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
