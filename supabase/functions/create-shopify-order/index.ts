import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OrderItem {
  variantId: string;
  quantity: number;
  title: string;
  priceHT: number;
}

interface OrderRequest {
  items: OrderItem[];
  orderNumber: string;
  customerEmail: string;
  shippingAddress?: {
    address: string;
    city: string;
    postalCode: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const shopifyDomain = Deno.env.get('SHOPIFY_DOMAIN');
    const shopifyAdminToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN');

    if (!shopifyDomain || !shopifyAdminToken) {
      console.error('Missing Shopify credentials');
      throw new Error('Shopify credentials not configured');
    }

    const { items, orderNumber, customerEmail, shippingAddress }: OrderRequest = await req.json();
    
    console.log('Creating Shopify order:', { orderNumber, customerEmail, itemCount: items.length });

    // Create draft order with line items
    const lineItems = items.map(item => ({
      variant_id: extractVariantId(item.variantId),
      quantity: item.quantity,
    }));

    const draftOrderPayload = {
      draft_order: {
        line_items: lineItems,
        email: customerEmail,
        note: `Commande vis-a-bois: ${orderNumber}`,
        tags: `vis-a-bois,${orderNumber}`,
        ...(shippingAddress && {
          shipping_address: {
            address1: shippingAddress.address,
            city: shippingAddress.city,
            zip: shippingAddress.postalCode,
            country: 'France',
            country_code: 'FR',
          }
        })
      }
    };

    console.log('Shopify payload:', JSON.stringify(draftOrderPayload, null, 2));

    // Create draft order via Shopify Admin API
    const response = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/draft_orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAdminToken,
        },
        body: JSON.stringify(draftOrderPayload),
      }
    );

    const responseText = await response.text();
    console.log('Shopify response status:', response.status);
    console.log('Shopify response:', responseText);

    if (!response.ok) {
      console.error('Shopify API error:', responseText);
      throw new Error(`Shopify API error: ${response.status} - ${responseText}`);
    }

    const shopifyData = JSON.parse(responseText);
    const draftOrder = shopifyData.draft_order;

    console.log('Draft order created:', draftOrder.id, draftOrder.name);

    // Complete the draft order to create an actual order
    const completeResponse = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/draft_orders/${draftOrder.id}/complete.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': shopifyAdminToken,
        },
        body: JSON.stringify({ payment_pending: true }),
      }
    );

    const completeText = await completeResponse.text();
    console.log('Complete response status:', completeResponse.status);
    console.log('Complete response:', completeText);

    if (!completeResponse.ok) {
      console.error('Failed to complete draft order:', completeText);
      // Return draft order info even if completion fails
      return new Response(JSON.stringify({
        success: true,
        shopifyOrderId: draftOrder.id,
        shopifyOrderName: draftOrder.name,
        status: 'draft',
        invoiceUrl: draftOrder.invoice_url,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const completedData = JSON.parse(completeText);
    const order = completedData.draft_order;

    return new Response(JSON.stringify({
      success: true,
      shopifyOrderId: order.order_id || draftOrder.id,
      shopifyOrderName: order.name || draftOrder.name,
      status: 'completed',
      invoiceUrl: order.invoice_url || draftOrder.invoice_url,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating Shopify order:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Extract numeric variant ID from Shopify GID
function extractVariantId(gid: string): number {
  // Format: gid://shopify/ProductVariant/12345678
  const match = gid.match(/\/(\d+)$/);
  if (match) {
    return parseInt(match[1], 10);
  }
  // If already a number, return as-is
  return parseInt(gid, 10);
}
