import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type AdminAuthResult =
  | { ok: true; userId: string; supabaseAdmin: ReturnType<typeof createClient> }
  | { ok: false; status: number; message: string };

export async function verifyAdminRequest(req: Request): Promise<AdminAuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    return { ok: false, status: 500, message: "Configuration Supabase manquante" };
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, status: 401, message: "Non autorisé" };
  }

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
  if (userError || !user) {
    return { ok: false, status: 401, message: "Non autorisé" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
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
