/**
 * Auth Edge pour appels machine-à-machine : compare le secret présenté
 * (Authorization: Bearer … ou header apikey) aux clés secrètes serveur
 * (SUPABASE_SERVICE_ROLE_KEY / sb_secret_* via listSupabaseSecretKeys).
 * Pas de décodage JWT « role == service_role » (forgible si verify_jwt=false).
 */

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

/** Lit le jeton présenté : Bearer en priorité, sinon header `apikey`. */
export function extractPresentedSecret(req: Request): string | null {
  const auth = req.headers.get("Authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    const token = m?.[1]?.trim();
    if (token) return token;
  }
  const apiKey = req.headers.get("apikey")?.trim();
  return apiKey || null;
}

/**
 * True si `presented` égale au moins une entrée de `allowedSecrets`
 * (comparaison temps constant sur chaque candidat).
 */
export function secretMatchesAny(
  presented: string,
  allowedSecrets: readonly string[],
): boolean {
  const presentedTrimmed = presented.trim();
  if (!presentedTrimmed) return false;

  let matched = false;
  for (const candidate of allowedSecrets) {
    const c = candidate.trim();
    if (!c) continue;
    if (timingSafeEqualString(presentedTrimmed, c)) {
      matched = true;
    }
  }
  return matched;
}

/** Autorise la requête si un secret serveur connu est présenté. */
export function authorizeServiceRoleRequest(
  req: Request,
  allowedSecrets: readonly string[],
): boolean {
  const presented = extractPresentedSecret(req);
  if (!presented) return false;
  const allowed = allowedSecrets.map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return false;
  return secretMatchesAny(presented, allowed);
}
