import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CheckoutItem {
  variantId: string;
  quantity: number;
}

interface CheckoutRequest {
  items: CheckoutItem[];
  customerEmail?: string;
}

// Extract numeric variant ID from Shopify GID
function extractVariantId(gid: string): string {
  const match = gid.match(/ProductVariant\/(\d+)/);
  return match ? match[1] : gid;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyDomain = Deno.env.get("SHOPIFY_DOMAIN");
    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_TOKEN");

    if (!shopifyDomain || !storefrontToken) {
      console.error("Missing Shopify credentials");
      throw new Error("Shopify credentials not configured");
    }

    // Format domain
    let formattedDomain = shopifyDomain.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
    if (!formattedDomain.includes(".myshopify.com")) {
      formattedDomain = `${formattedDomain}.myshopify.com`;
    }

    const { items, customerEmail }: CheckoutRequest = await req.json();
    console.log("Creating checkout for items:", items);

    // Build line items for the cart
    const lineItems = items.map((item) => ({
      merchandiseId: item.variantId.startsWith("gid://")
        ? item.variantId
        : `gid://shopify/ProductVariant/${extractVariantId(item.variantId)}`,
      quantity: item.quantity,
    }));

    // Create cart using Storefront API
    const createCartMutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const cartInput: any = {
      lines: lineItems,
    };

    // Add buyer identity if email provided
    if (customerEmail) {
      cartInput.buyerIdentity = {
        email: customerEmail,
      };
    }

    const response = await fetch(
      `https://${formattedDomain}/api/2024-01/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({
          query: createCartMutation,
          variables: { input: cartInput },
        }),
      }
    );

    const result = await response.json();
    console.log("Shopify cart response:", JSON.stringify(result, null, 2));

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      throw new Error(result.errors[0].message);
    }

    const cartData = result.data?.cartCreate;
    if (cartData?.userErrors?.length > 0) {
      console.error("User errors:", cartData.userErrors);
      throw new Error(cartData.userErrors[0].message);
    }

    if (!cartData?.cart?.checkoutUrl) {
      throw new Error("No checkout URL returned from Shopify");
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkoutUrl: cartData.cart.checkoutUrl,
        cartId: cartData.cart.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
