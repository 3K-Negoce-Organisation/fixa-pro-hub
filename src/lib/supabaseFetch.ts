/**
 * supabase-js ≤2.118 envoie encore `Authorization: Bearer sb_publishable_|sb_secret_`
 * sur REST/Storage quand il n’y a pas de session. Ce n’est pas un JWT : après
 * désactivation des clés legacy, Kong/PostgREST répondent PGRST301 / Invalid JWT.
 * Les nouvelles clés doivent rester uniquement dans `apikey`.
 */
export function fetchWithoutSbApiKeyBearer(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);
  const auth = headers.get("Authorization");
  if (
    auth &&
    (auth.startsWith("Bearer sb_publishable_") || auth.startsWith("Bearer sb_secret_"))
  ) {
    headers.delete("Authorization");
  }
  return fetch(input, { ...init, headers });
}
