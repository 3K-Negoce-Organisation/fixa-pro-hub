import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT-INTENT] ${step}${detailsStr}`);
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

function resolveStripeSecretKey(mode: "live" | "test"): string {
  if (mode === "test") {
    return Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  }
  // Mode live : **ne pas** retomber sur STRIPE_SECRET_KEY (souvent une clé test sur staging) — exige la clé live dédiée.
  return Deno.env.get("STRIPE_SECRET_KEY_LIVE") || "";
}

function assertSecretMatchesStripeMode(mode: "live" | "test", secret: string) {
  if (!secret) return;
  if (mode === "live" && secret.startsWith("sk_test_")) {
    throw new Error(
      "Configuration Stripe : mode live mais la clé secrète ressemble à une clé test (sk_test_). Définissez STRIPE_SECRET_KEY_LIVE avec une clé sk_live_.",
    );
  }
  if (mode === "test" && secret.startsWith("sk_live_")) {
    throw new Error(
      "Configuration Stripe : mode test mais la clé secrète ressemble à une clé live (sk_live_). Utilisez STRIPE_SECRET_KEY_TEST ou STRIPE_SECRET_KEY (sk_test_).",
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header (optional for guests - verify_jwt is false)
    const authHeader = req.headers.get("Authorization");
    let userEmail: string | undefined;
    let userId: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      try {
        const { data: userData, error } = await supabaseClient.auth.getUser(token);
        if (!error && userData.user) {
          userEmail = userData.user.email;
          userId = userData.user.id;
          logStep("User authenticated", { userId, email: userEmail });
        } else {
          logStep("Auth token invalid or expired, treating as guest", { error: error?.message });
        }
      } catch (authError) {
        logStep("Auth error, treating as guest", { error: String(authError) });
      }
    } else {
      logStep("No auth header, treating as guest checkout");
    }

    // Parse request body
    const { items, guestEmail } = await req.json() as { items: CartItem[]; guestEmail?: string };
    logStep("Received cart items", { itemCount: items.length, isGuest: !userId, guestEmail });

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    let resolvedSiteId: string | undefined;
    let stripeMode: "live" | "test" = "live";

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    const siteSlug = Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";
    const { data: site, error: siteErr } = await admin
      .from("sites")
      .select("id, storefront_public, stripe_mode")
      .eq("slug", siteSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (siteErr) throw siteErr;
    resolvedSiteId = site?.id;
    stripeMode = site?.stripe_mode === "test" ? "test" : "live";

    if (!userId) {
      if (!site?.storefront_public) {
        return new Response(
          JSON.stringify({
            error: "La boutique n'est pas ouverte au public. Connectez-vous pour commander.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const ge = (guestEmail ?? "").trim().toLowerCase();
      if (!ge || !ge.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ge)) {
        return new Response(
          JSON.stringify({ error: "Email requis pour la commande invité." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const stripeKey = resolveStripeSecretKey(stripeMode);
    if (!stripeKey) {
      logStep("ERROR: No Stripe secret for mode", { stripeMode });
      throw new Error(
        stripeMode === "test"
          ? "STRIPE_SECRET_KEY_TEST (ou STRIPE_SECRET_KEY) non configuré"
          : "STRIPE_SECRET_KEY_LIVE non configuré (obligatoire en mode live ; ne pas s'appuyer sur STRIPE_SECRET_KEY seul)",
      );
    }
    assertSecretMatchesStripeMode(stripeMode, stripeKey);
    logStep("Stripe key resolved", { stripeMode });

    // Totaux : sous-total produits TTC, puis frais de port 12 EUR TTC si sous-total < 150 EUR TTC
    const TVA_RATE = 0.20;
    const FREE_SHIPPING_THRESHOLD_TTC = 150;
    const SHIPPING_FEE_TTC = 12;

    const productsHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
    const subtotalTTC = productsHT * (1 + TVA_RATE);
    const shippingTTC = subtotalTTC >= FREE_SHIPPING_THRESHOLD_TTC ? 0 : SHIPPING_FEE_TTC;
    const shippingHT = shippingTTC > 0 ? SHIPPING_FEE_TTC / (1 + TVA_RATE) : 0;
    const totalHT = productsHT + shippingHT;
    const totalTTC = subtotalTTC + shippingTTC;
    const amountInCents = Math.round(totalTTC * 100);
    logStep("Calculated totals", { productsHT, subtotalTTC, shippingTTC, totalHT, totalTTC, amountInCents });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists or create one (only if we have an email)
    let customerId: string | undefined;
    const emailToUse = userEmail || guestEmail;
    
    if (emailToUse) {
      const customers = await stripe.customers.list({ email: emailToUse, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: emailToUse,
          metadata: userId ? { user_id: userId } : { guest: "true" },
        });
        customerId = customer.id;
        logStep("Created new Stripe customer", { customerId, isGuest: !userId });
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: customerId,
      // Cartes + portefeuilles (Apple Pay / Google Pay) via Payment Element si domaine vérifié dans Stripe
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: userId || "guest",
        user_email: emailToUse || "",
        is_guest: (!userId).toString(),
        shipping_fee_ttc: shippingTTC.toFixed(2),
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
        site_id: resolvedSiteId || "",
        stripe_mode: stripeMode,
        // Store only essential item data (id, quantity, price) to stay under 500 char limit
        items_compact: JSON.stringify(items.map(i => ({
          i: i.id,
          q: i.quantity,
          p: i.priceHT,
        }))),
        items_count: items.length.toString(),
      },
    });

    logStep("PaymentIntent created", { 
      paymentIntentId: paymentIntent.id, 
      clientSecret: paymentIntent.client_secret?.substring(0, 20) + "...",
      isGuest: !userId,
    });

    return new Response(JSON.stringify({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountInCents,
    }), {
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
