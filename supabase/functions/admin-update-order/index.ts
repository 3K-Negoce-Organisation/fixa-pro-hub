import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper to ensure domain is properly formatted
function formatShopifyDomain(domain: string): string {
  // If it already includes myshopify.com, return as-is
  if (domain.includes('.myshopify.com')) {
    return domain.replace(/^https?:\/\//, ''); // Remove protocol if present
  }
  // Otherwise, append .myshopify.com
  return `${domain.replace(/^https?:\/\//, '')}.myshopify.com`;
}

// Shopify status sync functions
async function createShopifyFulfillment(
  shopifyDomain: string,
  shopifyToken: string,
  shopifyOrderId: string,
  trackingNumber: string | null,
  carrier: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, get the fulfillment order ID
    const fulfillmentOrdersRes = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders/${shopifyOrderId}/fulfillment_orders.json`,
      {
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!fulfillmentOrdersRes.ok) {
      const errorText = await fulfillmentOrdersRes.text();
      console.error('Failed to get fulfillment orders:', errorText);
      return { success: false, error: 'Impossible de récupérer les informations de fulfillment Shopify' };
    }

    const fulfillmentOrdersData = await fulfillmentOrdersRes.json();
    const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders || [];
    
    if (fulfillmentOrders.length === 0) {
      return { success: false, error: 'Aucun fulfillment order trouvé pour cette commande' };
    }

    // Create fulfillment for each fulfillment order
    for (const fo of fulfillmentOrders) {
      if (fo.status === 'closed') continue;

      const fulfillmentPayload: Record<string, unknown> = {
        fulfillment: {
          line_items_by_fulfillment_order: [{
            fulfillment_order_id: fo.id,
          }],
          notify_customer: true,
        }
      };

      if (trackingNumber) {
        fulfillmentPayload.fulfillment = {
          ...fulfillmentPayload.fulfillment as object,
          tracking_info: {
            number: trackingNumber,
            company: carrier || undefined,
          }
        };
      }

      const fulfillRes = await fetch(
        `https://${shopifyDomain}/admin/api/2024-01/fulfillments.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': shopifyToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(fulfillmentPayload),
        }
      );

      if (!fulfillRes.ok) {
        const errorText = await fulfillRes.text();
        console.error('Failed to create fulfillment:', errorText);
        return { success: false, error: 'Erreur lors de la création du fulfillment Shopify' };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Shopify fulfillment error:', error);
    return { success: false, error: 'Erreur de connexion à Shopify' };
  }
}

async function cancelShopifyOrder(
  shopifyDomain: string,
  shopifyToken: string,
  shopifyOrderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(
      `https://${shopifyDomain}/admin/api/2024-01/orders/${shopifyOrderId}/cancel.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': shopifyToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'customer',
          email: true,
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to cancel Shopify order:', errorText);
      return { success: false, error: 'Erreur lors de l\'annulation de la commande Shopify' };
    }

    return { success: true };
  } catch (error) {
    console.error('Shopify cancel error:', error);
    return { success: false, error: 'Erreur de connexion à Shopify' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const shopifyDomain = Deno.env.get('SHOPIFY_DOMAIN');
    const shopifyToken = Deno.env.get('SHOPIFY_ADMIN_TOKEN');
    
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their identity
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User authenticated:', user.email);

    // Use service role to check admin status (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('User is not admin:', user.email);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified:', user.email);

// Parse request body
    const { order_id, status, tracking_number, carrier, resend_to_shopify } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle resend to Shopify
    if (resend_to_shopify) {
      console.log('Resending order to Shopify:', order_id);
      
      // Get order with items
      const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        return new Response(
          JSON.stringify({ error: 'Commande non trouvée' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: orderItems, error: itemsError } = await supabaseAdmin
        .from('order_items')
        .select('*')
        .eq('order_id', order_id);

      if (itemsError) {
        console.error('Error fetching order items:', itemsError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors de la récupération des articles' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user email
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
      const customerEmail = userData?.user?.email;

      if (!shopifyDomain || !shopifyToken) {
        return new Response(
          JSON.stringify({ error: 'Configuration Shopify manquante' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Format the domain correctly
      const formattedDomain = formatShopifyDomain(shopifyDomain);

      // Create draft order on Shopify
      const lineItems = orderItems?.map((item: any) => ({
        title: item.product_title,
        variant_title: item.variant_title || undefined,
        quantity: item.quantity,
        price: item.unit_price_ttc.toString(),
      })) || [];

      const draftOrderPayload = {
        draft_order: {
          line_items: lineItems,
          customer: customerEmail ? { email: customerEmail } : undefined,
          shipping_address: order.shipping_address ? {
            address1: order.shipping_address,
            city: order.shipping_city,
            zip: order.shipping_postal_code,
            country: 'FR',
          } : undefined,
          note: `Renvoi - Commande originale: ${order.order_number}`,
          use_customer_default_address: false,
        }
      };

      try {
        console.log('Creating draft order on Shopify domain:', formattedDomain);
        const draftRes = await fetch(
          `https://${formattedDomain}/admin/api/2024-01/draft_orders.json`,
          {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(draftOrderPayload),
          }
        );

        if (!draftRes.ok) {
          const errorText = await draftRes.text();
          console.error('Failed to create draft order:', errorText);
          return new Response(
            JSON.stringify({ 
              success: false, 
              shopify_warning: 'Erreur lors de la création du brouillon Shopify' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const draftData = await draftRes.json();
        const draftOrderId = draftData.draft_order?.id;
        console.log('Draft order created:', draftOrderId);

        // Complete the draft order
        const completeRes = await fetch(
          `https://${formattedDomain}/admin/api/2024-01/draft_orders/${draftOrderId}/complete.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': shopifyToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ payment_pending: false }),
          }
        );

        if (!completeRes.ok) {
          const errorText = await completeRes.text();
          console.error('Failed to complete draft order:', errorText);
          return new Response(
            JSON.stringify({ 
              success: true, 
              shopify_warning: 'Brouillon créé mais non finalisé sur Shopify' 
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const completeData = await completeRes.json();
        const newShopifyOrderId = completeData.draft_order?.order_id;
        console.log('Draft order completed, new order ID:', newShopifyOrderId);

        // Update local order with new Shopify order ID
        if (newShopifyOrderId) {
          await supabaseAdmin
            .from('orders')
            .update({ 
              shopify_order_id: newShopifyOrderId.toString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', order_id);
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Commande renvoyée à Shopify avec succès',
            shopify_order_id: newShopifyOrderId,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      } catch (error) {
        console.error('Shopify resend error:', error);
        return new Response(
          JSON.stringify({ 
            success: false, 
            shopify_warning: 'Erreur de connexion à Shopify' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Get current order to check shopify_order_id
    const { data: currentOrder, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single();

    if (orderError || !currentOrder) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Commande non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (carrier !== undefined) updateData.carrier = carrier;
    updateData.updated_at = new Date().toISOString();

    console.log('Updating order:', order_id, 'with:', updateData);

    // Update order using service role
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('orders')
      .update(updateData)
      .eq('id', order_id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erreur lors de la mise à jour', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order updated successfully:', updatedOrder.order_number);

    // Sync with Shopify if applicable
    let shopifyWarning: string | null = null;
    const shopifyOrderId = currentOrder.shopify_order_id;

    if (shopifyOrderId && shopifyDomain && shopifyToken && status) {
      console.log('Syncing status to Shopify:', status, 'for order:', shopifyOrderId);

      if (status === 'shipped') {
        const result = await createShopifyFulfillment(
          shopifyDomain,
          shopifyToken,
          shopifyOrderId,
          tracking_number || currentOrder.tracking_number,
          carrier || currentOrder.carrier
        );
        if (!result.success) {
          shopifyWarning = result.error || 'Erreur de synchronisation Shopify';
          console.error('Shopify sync failed:', result.error);
        } else {
          console.log('Shopify fulfillment created successfully');
        }
      } else if (status === 'cancelled') {
        const result = await cancelShopifyOrder(shopifyDomain, shopifyToken, shopifyOrderId);
        if (!result.success) {
          shopifyWarning = result.error || 'Erreur de synchronisation Shopify';
          console.error('Shopify cancel failed:', result.error);
        } else {
          console.log('Shopify order cancelled successfully');
        }
      }
    } else if (status && (status === 'shipped' || status === 'cancelled') && !shopifyOrderId) {
      console.log('No shopify_order_id, skipping Shopify sync');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: updatedOrder,
        shopify_warning: shopifyWarning,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: 'Erreur serveur', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});