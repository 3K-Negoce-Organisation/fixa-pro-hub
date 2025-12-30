import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Create Supabase client with user's auth to verify identity
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    console.log(`GDPR Account Deletion requested for user: ${user.id}`);

    // Create admin client for deletion operations
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Step 1: Anonymize orders (keep for accounting purposes but remove personal data)
    const { error: ordersError } = await supabaseAdmin
      .from("orders")
      .update({
        shipping_name: "COMPTE SUPPRIMÉ",
        shipping_address: null,
        shipping_city: null,
        shipping_postal_code: null,
        user_email: "supprime@rgpd.local",
        notes: "Données personnelles effacées - RGPD Art. 17",
      })
      .eq("user_id", user.id);

    if (ordersError) {
      console.error("Error anonymizing orders:", ordersError);
    }

    // Step 2: Delete profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", user.id);

    if (profileError) {
      console.error("Error deleting profile:", profileError);
    }

    // Step 3: Delete user roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user.id);

    if (rolesError) {
      console.error("Error deleting user roles:", rolesError);
    }

    // Step 4: Delete user from auth.users
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error("Error deleting user:", deleteUserError);
      throw new Error("Failed to delete user account");
    }

    console.log(`GDPR Account Deletion completed for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Compte et données supprimés avec succès" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("GDPR Delete Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
