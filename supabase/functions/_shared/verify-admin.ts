import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getSupabaseAnonKey,
  getSupabaseServiceRoleKey,
  isServiceRoleBearer,
} from "./supabaseApiKeys.ts";

export type AdminAuthResult =
  | { ok: true; userId: string; supabaseAdmin: ReturnType<typeof createClient> }
  | { ok: false; status: number; message: string };

export { isServiceRoleBearer } from "./supabaseApiKeys.ts";

/**
 * Requête admin (JWT session) ou interne (JWT service_role / sb_secret_*).
 */
export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = getSupabaseServiceRoleKey();
  const supabaseAnonKey = getSupabaseAnonKey();

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return { ok: false, status: 500, message: "Configuration Supabase manquante" };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, message: "Non autorisé" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  if (isServiceRoleBearer(authHeader)) {
    return { ok: true, userId: "service_role", supabaseAdmin };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, message: "Non autorisé" };
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();

  if (!roleData) {
    return { ok: false, status: 403, message: "Accès refusé - Droits administrateur requis" };
  }

  return { ok: true, userId: user.id, supabaseAdmin };
}
