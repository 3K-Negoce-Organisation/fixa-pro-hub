import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import {
  fulfillPaymentIntentOrder,
  stripeClientForPaymentIntent,
} from "../_shared/payment-intent-order.ts";
import { signGuestOrderTrackingToken } from "../_shared/guest-order-tracking-token.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      payment_intent_id,
      shipping_name,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      phone,
      user_email,
    } = body ?? {};

    if (!payment_intent_id || typeof payment_intent_id !== "string") {
      return new Response(JSON.stringify({ error: "payment_intent_id requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const stripeLive = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "",
      { apiVersion: "2025-08-27.basil" },
    );
    const stripeTest = new Stripe(
      Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "",
      { apiVersion: "2025-08-27.basil" },
    );

    let paymentIntent;
    try {
      paymentIntent = await stripeLive.paymentIntents.retrieve(payment_intent_id);
    } catch {
      paymentIntent = await stripeTest.paymentIntents.retrieve(payment_intent_id);
    }

    const stripe = stripeClientForPaymentIntent(paymentIntent);
    const freshIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    const result = await fulfillPaymentIntentOrder(supabaseAdmin, stripe, freshIntent, {
      shipping_name,
      shipping_address,
      shipping_city,
      shipping_postal_code,
      phone,
      user_email,
    });

    const customerEmail = typeof user_email === "string" ? user_email.trim().toLowerCase() : "";
    const tracking_token =
      customerEmail && result.order_number
        ? await signGuestOrderTrackingToken(result.order_number, customerEmail)
        : undefined;

    return new Response(JSON.stringify({ success: true, ...result, tracking_token }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[complete-checkout-order]", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
