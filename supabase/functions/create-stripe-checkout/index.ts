import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-STRIPE-CHECKOUT] ${step}${detailsStr}`);
};

interface CartItem {
  id: string;
  variantId: string;
  title: string;
  variantTitle: string;
  priceHT: number;
  image: string;
  quantity: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      userEmail = userData.user?.email;
      userId = userData.user?.id;
      logStep("User authenticated", { userId, email: userEmail });
    }

    // Parse request body
    const { items, guestEmail: rawGuestEmail } = await req.json() as {
      items: CartItem[];
      guestEmail?: string;
    };
    const guestEmail = (rawGuestEmail ?? "").trim().toLowerCase();
    logStep("Received cart items", { itemCount: items.length, hasGuestEmail: !!guestEmail });

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    if (!userId) {
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (!serviceKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
      }
      const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
      const siteSlug = Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";
      const { data: site, error: siteErr } = await admin
        .from("sites")
        .select("storefront_public")
        .eq("slug", siteSlug)
        .eq("is_active", true)
        .maybeSingle();
      if (siteErr) throw siteErr;
      if (!site?.storefront_public) {
        return new Response(
          JSON.stringify({
            error: "La boutique n'est pas ouverte au public. Connectez-vous pour commander.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Calculate totals
    const TVA_RATE = 0.20;
    const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
    const totalTTC = totalHT * (1 + TVA_RATE);
    logStep("Calculated totals", { totalHT, totalTTC });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const emailForCheckout = userEmail || (guestEmail && guestEmail.includes("@") ? guestEmail : undefined);

    // Check if customer exists
    let customerId: string | undefined;
    if (emailForCheckout) {
      const customers = await stripe.customers.list({ email: emailForCheckout, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      }
    }

    // Build line items with dynamic pricing (price_data)
    const lineItems = items.map(item => {
      const unitAmountTTC = Math.round(item.priceHT * (1 + TVA_RATE) * 100); // Convert to cents
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            description: item.variantTitle !== "Unité" ? item.variantTitle : undefined,
            images: item.image && item.image !== "/placeholder.svg" ? [item.image] : undefined,
            metadata: {
              product_id: item.id,
              variant_id: item.variantId,
            },
          },
          unit_amount: unitAmountTTC,
        },
        quantity: item.quantity,
      };
    });
    logStep("Built line items", { count: lineItems.length });

    // Create Stripe Checkout session
    const origin = req.headers.get("origin") || "https://vis-a-bois.fr";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : emailForCheckout,
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/paiement-annule`,
      shipping_address_collection: {
        allowed_countries: ['FR'],
      },
      phone_number_collection: {
        enabled: true,
      },
      metadata: {
        user_id: userId || "",
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
        items_json: JSON.stringify(items.map(i => ({
          id: i.id,
          variantId: i.variantId,
          title: i.title,
          variantTitle: i.variantTitle,
          priceHT: i.priceHT,
          quantity: i.quantity,
          image: i.image,
        }))),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
