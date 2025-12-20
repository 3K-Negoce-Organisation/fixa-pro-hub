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

    if (!userId) {
      throw new Error("User must be authenticated");
    }

    // Parse request body
    const { items } = await req.json() as { items: CartItem[] };
    logStep("Received cart items", { itemCount: items.length });

    if (!items || items.length === 0) {
      throw new Error("Cart is empty");
    }

    // Calculate totals
    const TVA_RATE = 0.20;
    const totalHT = items.reduce((sum, item) => sum + (item.priceHT * item.quantity), 0);
    const totalTTC = totalHT * (1 + TVA_RATE);
    const amountInCents = Math.round(totalTTC * 100);
    logStep("Calculated totals", { totalHT, totalTTC, amountInCents });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists or create one
    let customerId: string | undefined;
    if (userEmail) {
      const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found existing Stripe customer", { customerId });
      } else {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
        logStep("Created new Stripe customer", { customerId });
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'eur',
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: userId,
        user_email: userEmail || "",
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
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
      clientSecret: paymentIntent.client_secret?.substring(0, 20) + "..." 
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
