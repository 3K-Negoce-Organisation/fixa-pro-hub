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

    // Create Supabase client with user's auth
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

    console.log(`GDPR Data Export requested for user: ${user.id}`);

    // Get user profile
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    // Get user orders
    const { data: orders } = await supabaseClient
      .from("orders")
      .select(`
        id,
        order_number,
        status,
        total_ht,
        total_ttc,
        shipping_address,
        shipping_city,
        shipping_postal_code,
        shipping_name,
        created_at,
        order_items (
          product_title,
          variant_title,
          quantity,
          unit_price_ht,
          unit_price_ttc
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    // Build export data
    const exportData = {
      export_date: new Date().toISOString(),
      export_format: "RGPD - Article 15 - Droit d'accès",
      user_information: {
        email: user.email,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at,
      },
      profile: profile ? {
        company_name: profile.company_name,
        phone: profile.phone,
        billing_address: profile.billing_address,
        billing_city: profile.billing_city,
        billing_postal_code: profile.billing_postal_code,
        shipping_address: profile.shipping_address,
        shipping_city: profile.shipping_city,
        shipping_postal_code: profile.shipping_postal_code,
        same_as_billing: profile.same_as_billing,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      } : null,
      consents: profile ? {
        marketing_consent: profile.marketing_consent,
        marketing_consent_date: profile.marketing_consent_date,
        newsletter_consent: profile.newsletter_consent,
        newsletter_consent_date: profile.newsletter_consent_date,
      } : null,
      orders: orders || [],
      data_retention_info: {
        description: "Vos données sont conservées conformément à notre politique de confidentialité.",
        legal_basis: "Exécution du contrat et obligations légales",
      },
    };

    console.log(`GDPR Export completed for user: ${user.id}`);

    return new Response(JSON.stringify(exportData), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("GDPR Export Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
