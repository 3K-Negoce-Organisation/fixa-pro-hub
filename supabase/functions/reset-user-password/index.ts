import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAdminRequest } from "../_shared/verify-admin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIN_PASSWORD_LENGTH = 6;

function resolveRecoveryRedirect(req: Request, redirectTo?: string | null): string {
  const fromBody = redirectTo?.trim();
  if (fromBody) return fromBody;

  const fromEnv = Deno.env.get("STOREFRONT_URL")?.trim();
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, "")}/auth?type=recovery`;
  }

  const origin = req.headers.get("Origin")?.trim();
  if (origin && !origin.includes("admin")) {
    return `${origin.replace(/\/$/, "")}/auth?type=recovery`;
  }

  return "https://www.vis-a-bois.com/auth?type=recovery";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = await verifyAdminRequest(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.message }), {
        status: auth.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userId = String(body.user_id ?? "").trim();
    const mode = String(body.mode ?? "email").trim();
    const password = String(body.password ?? "");
    const redirectTo = resolveRecoveryRedirect(req, body.redirect_to);

    if (!userId) {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userError } = await auth.supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Utilisateur introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = userData.user.email;

    if (mode === "set") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        return new Response(
          JSON.stringify({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: updateError } = await auth.supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });

      if (updateError) {
        console.error("reset-user-password set error:", updateError);
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, mode: "set", email }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode !== "email") {
      return new Response(JSON.stringify({ error: "mode invalide (email ou set)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const publicClient = createClient(supabaseUrl, supabaseAnonKey);

    const { error: resetError } = await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (resetError) {
      console.error("reset-user-password email error:", resetError);
      return new Response(JSON.stringify({ error: resetError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, mode: "email", email, redirect_to: redirectTo }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("reset-user-password unexpected error:", error);
    return new Response(JSON.stringify({ error: "Erreur interne" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
