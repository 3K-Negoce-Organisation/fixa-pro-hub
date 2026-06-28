import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { ensureFrenchStripeCustomer } from "../_shared/stripe-customer-fr.ts";
import { computeCheckoutTotals } from "../_shared/checkout-totals.ts";
import { roundMoney } from "../_shared/money.ts";
import {
  filterPayableCartLines,
  stripeMetadataForCompactItems,
  toCompactCartItems,
} from "../_shared/stripe-cart-metadata.ts";

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
  priceTTC?: number;
  image: string;
  quantity: number;
  isGift?: boolean;
}

function resolveStripeSecretKey(mode: "live" | "test"): string {
  if (mode === "test") {
    return Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "";
  }
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
    const { items, guestEmail: rawGuestEmail, site_slug: rawSiteSlug } = await req.json() as {
      items: CartItem[];
      guestEmail?: string;
      site_slug?: string;
    };
    const guestEmail = (rawGuestEmail ?? "").trim().toLowerCase();
    logStep("Received cart items", { itemCount: items.length, hasGuestEmail: !!guestEmail });

    const payableItems = filterPayableCartLines(items ?? []);
    if (payableItems.length === 0) {
      throw new Error("Cart is empty");
    }

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    const siteSlug = (rawSiteSlug ?? "").trim() || Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois";
    const { data: site, error: siteErr } = await admin
      .from("sites")
      .select("id, storefront_public, stripe_mode")
      .eq("slug", siteSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (siteErr) throw siteErr;

    if (!userId) {
      if (!site?.storefront_public) {
        return new Response(
          JSON.stringify({
            error: "La boutique n'est pas ouverte au public. Connectez-vous pour commander.",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const stripeMode: "live" | "test" = site?.stripe_mode === "test" ? "test" : "live";
    const stripeKey = resolveStripeSecretKey(stripeMode);
    if (!stripeKey) {
      throw new Error(
        stripeMode === "test"
          ? "STRIPE_SECRET_KEY_TEST (ou STRIPE_SECRET_KEY) non configuré"
          : "STRIPE_SECRET_KEY_LIVE non configuré (obligatoire en mode live ; ne pas s'appuyer sur STRIPE_SECRET_KEY seul)",
      );
    }
    assertSecretMatchesStripeMode(stripeMode, stripeKey);
    logStep("Stripe key resolved", { stripeMode });

    const checkoutSiteId = site?.id ?? "";

    const roundedItems = payableItems.map((item) => {
      const priceTTC =
        item.priceTTC != null && item.priceTTC > 0
          ? roundMoney(item.priceTTC)
          : roundMoney(roundMoney(item.priceHT) * 1.2);
      const priceHT =
        item.priceHT > 0 ? roundMoney(item.priceHT) : roundMoney(priceTTC / 1.2);
      return { ...item, priceHT, priceTTC };
    });
    const { productsHT, subtotalTTC, shippingTTC, shippingHT, totalHT, totalTTC } =
      computeCheckoutTotals(roundedItems);
    logStep("Calculated totals", { productsHT, subtotalTTC, shippingTTC, totalHT, totalTTC });
    const itemsMetadata = stripeMetadataForCompactItems(toCompactCartItems(roundedItems));

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const emailForCheckout = userEmail || (guestEmail && guestEmail.includes("@") ? guestEmail : undefined);

    let customerId: string | undefined;
    if (emailForCheckout) {
      customerId = await ensureFrenchStripeCustomer(stripe, emailForCheckout, {
        userId,
        isGuest: !userId,
      });
      logStep("Stripe customer ready (fr)", { customerId });
    }

    // Build line items with dynamic pricing (price_data)
    const lineItems = roundedItems.map(item => {
      const unitAmountTTC = Math.round(roundMoney(item.priceTTC ?? item.priceHT * 1.2) * 100);
      return {
        price_data: {
          currency: 'eur',
          product_data: {
            name: item.title,
            description: item.variantTitle !== "Unité" ? item.variantTitle : undefined,
            images: item.image && !item.image.endsWith("/trex-fallback.png") && item.image !== "/placeholder.svg" ? [item.image] : undefined,
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
    if (shippingTTC > 0) {
      lineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Frais de livraison',
          },
          unit_amount: Math.round(SHIPPING_FEE_TTC * 100),
        },
        quantity: 1,
      });
    }
    logStep("Built line items", { count: lineItems.length });

    // Create Stripe Checkout session
    const origin = req.headers.get("origin") || "https://www.vis-a-bois.com";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : emailForCheckout,
      locale: "fr",
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
        shipping_fee_ttc: shippingTTC.toFixed(2),
        total_ht: totalHT.toFixed(2),
        total_ttc: totalTTC.toFixed(2),
        site_id: checkoutSiteId,
        stripe_mode: stripeMode,
        ...itemsMetadata,
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
