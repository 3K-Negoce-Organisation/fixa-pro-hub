import { authorizeServiceRoleRequest } from "../_shared/serviceRoleRequestAuth.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export type SimulateMachineAuthDeps = {
  /** Secrets serveur (listSupabaseSecretKeys). */
  allowedSecrets: readonly string[];
  /** Clé attendue pour x-marketplace-internal (MARKETPLACE_HUB_API_KEY / VAB_API_KEY). */
  expectedInternalKey: string | null;
};

export type SimulateMachineAuthOk = {
  ok: true;
  mode: "service_role" | "internal";
};

export type SimulateMachineAuthDenied = {
  ok: false;
  response: Response;
};

/**
 * Auth machine (service_role secret ou header interne marketplace).
 * Ne décode jamais un JWT pour le rôle — égalité de secret uniquement.
 * Retourne null si ce n’est ni service_role ni internal (chemin admin user à suivre).
 */
export function resolveSimulateMachineAuth(
  req: Request,
  deps: SimulateMachineAuthDeps,
): SimulateMachineAuthOk | SimulateMachineAuthDenied | null {
  if (authorizeServiceRoleRequest(req, deps.allowedSecrets)) {
    return { ok: true, mode: "service_role" };
  }

  const authHeader = req.headers.get("Authorization");
  const internalKey = req.headers.get("x-marketplace-internal");
  const expected = deps.expectedInternalKey?.trim() || "";
  const isInternal =
    !!expected
    && !!internalKey
    && internalKey === expected
    && !!authHeader?.startsWith("Bearer ");

  if (isInternal) {
    return { ok: true, mode: "internal" };
  }

  return null;
}

/**
 * Sonde HTTP testable pour l’auth service_role (Bearer/apikey vs secrets serveur).
 * 200 si secret valide, 401 sinon (JWT forgé, vide, liste vide, etc.).
 */
export function probeSimulateServiceRoleAuth(
  req: Request,
  allowedSecrets: readonly string[],
): Response {
  if (!authorizeServiceRoleRequest(req, allowedSecrets)) {
    return json(401, { error: "Non autorisé" });
  }
  return json(200, { authorized: true });
}
