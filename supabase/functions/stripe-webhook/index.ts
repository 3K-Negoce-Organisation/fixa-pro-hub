import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { splitOrderTotals } from "../_shared/order-totals.ts";
import { sendOrderConfirmationEmail } from "../_shared/send-order-confirmation-email.ts";
import { alsafixCodeOnly, enrichItemsWithAlsafixCodes } from "../_shared/alsafix-code.ts";
import { generateOrderPDF } from "../_shared/generate-order-pdf.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate order number
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `VIS-${year}${month}-${random}`;
}


// Fetch full product details from Supabase
async function fetchProductDetails(supabaseAdmin: any, productIds: string[]): Promise<Map<string, any>> {
  const productMap = new Map();
  
  if (productIds.length === 0) return productMap;
  
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, title, handle, images, code_alsafix, box_quantity')
    .in('id', productIds);
  
  if (error) {
    logStep("Error fetching products", { error: error.message });
    return productMap;
  }
  
  for (const product of products || []) {
    productMap.set(product.id, product);
  }
  
  return productMap;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Résout `orders.site_id` pour l’admin (filtre par boutique). */
async function resolveOrderSiteId(
  supabaseAdmin: ReturnType<typeof createClient>,
  metadata: Record<string, string | undefined>,
): Promise<string | null> {
  const fromStripe = metadata.site_id?.trim();
  if (fromStripe && UUID_RE.test(fromStripe)) {
    const { data } = await supabaseAdmin.from("sites").select("id").eq("id", fromStripe).maybeSingle();
    if (data?.id) return data.id;
  }
  const slug = (Deno.env.get("STOREFRONT_SITE_SLUG") || "vis-a-bois").trim();
  const { data: site } = await supabaseAdmin
    .from("sites")
    .select("id")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return site?.id ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const placeholderKey =
      Deno.env.get("STRIPE_SECRET_KEY_LIVE") ||
      Deno.env.get("STRIPE_SECRET_KEY") ||
      "sk_live_placeholder";
    const verifyClient = new Stripe(placeholderKey, { apiVersion: "2025-08-27.basil" });

    const webhookSecrets = [
      Deno.env.get("STRIPE_WEBHOOK_SECRET_LIVE"),
      Deno.env.get("STRIPE_WEBHOOK_SECRET"),
      Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST"),
    ].filter((s, i, arr): s is string => Boolean(s) && arr.indexOf(s) === i);

    if (webhookSecrets.length === 0) {
      throw new Error("Aucun STRIPE_WEBHOOK_SECRET_* configuré");
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event | null = null;
    let verifyError: unknown = null;
    for (const whSecret of webhookSecrets) {
      try {
        event = await verifyClient.webhooks.constructEventAsync(body, signature, whSecret);
        break;
      } catch (e) {
        verifyError = e;
      }
    }
    if (!event) {
      const message = verifyError instanceof Error ? verifyError.message : "Webhook verification failed";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("Webhook signature verified", { eventType: event.type, livemode: event.livemode });

    const stripeApiKey = event.livemode
      ? (Deno.env.get("STRIPE_SECRET_KEY_LIVE") || Deno.env.get("STRIPE_SECRET_KEY") || "")
      : (Deno.env.get("STRIPE_SECRET_KEY_TEST") || Deno.env.get("STRIPE_SECRET_KEY") || "");
    if (!stripeApiKey) {
      throw new Error(
        event.livemode
          ? "STRIPE_SECRET_KEY_LIVE (ou STRIPE_SECRET_KEY) manquant pour traiter cet événement live"
          : "STRIPE_SECRET_KEY_TEST (ou STRIPE_SECRET_KEY) manquant pour traiter cet événement test",
      );
    }
    const stripe = new Stripe(stripeApiKey, { apiVersion: "2025-08-27.basil" });
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    // Create Supabase client with service role
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Handle payment_intent.succeeded (from Stripe Elements PaymentIntent flow)
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      logStep("Processing PaymentIntent succeeded", { paymentIntentId: paymentIntent.id });

      // Check if order already exists with this PaymentIntent ID
      // (Frontend may have already created the order)
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, total_ht, total_ttc, user_email, shipping_address, shipping_city, shipping_postal_code, shipping_name")
        .ilike("notes", `%${paymentIntent.id}%`)
        .maybeSingle();

      if (existingOrder) {
        logStep("Order already exists for this PaymentIntent", { 
          orderId: existingOrder.id, 
          orderNumber: existingOrder.order_number 
        });

        // Get order items for n8n webhook
        const { data: existingItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", existingOrder.id);

        // Send webhook to n8n for fulfillment (even if order already exists)
        if (n8nWebhookUrl) {
          const cartItems = (existingItems || []).map(item => ({
            id: item.product_id,
            title: item.product_title,
            variantTitle: item.variant_title,
            image: item.product_image,
            quantity: item.quantity,
            priceHT: item.unit_price_ht,
          }));

          await sendToN8n(
            n8nWebhookUrl,
            supabaseAdmin,
            existingOrder.order_number,
            existingOrder.id,
            paymentIntent.id,
            existingOrder.shipping_name,
            existingOrder.user_email,
            null, // phone
            existingOrder.shipping_address ? {
              line1: existingOrder.shipping_address,
              city: existingOrder.shipping_city,
              postal_code: existingOrder.shipping_postal_code,
            } : null,
            cartItems,
            existingOrder.total_ht,
            existingOrder.total_ttc
          );
        }

        logStep("PaymentIntent processing complete (existing order)");
        return new Response(JSON.stringify({ received: true, existing_order: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // No existing order found - create new one
      const metadata = paymentIntent.metadata || {};
      const userId = metadata.user_id !== "guest" ? metadata.user_id : null;
      const userEmail = metadata.user_email || null;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsCompact = metadata.items_compact;

      logStep("PaymentIntent metadata", { userId, userEmail, totalHT, totalTTC });

      const orderSiteId = await resolveOrderSiteId(supabaseAdmin, metadata);
      logStep("Resolved order site_id", { orderSiteId });

      // Parse compact items from metadata
      let cartItems: any[] = [];
      try {
        const compactItems = JSON.parse(itemsCompact || "[]");
        // Compact format: { i: id, q: quantity, p: priceHT }
        cartItems = compactItems.map((item: any) => ({
          id: item.i,
          quantity: item.q,
          priceHT: item.p,
        }));
        logStep("Parsed compact items", { count: cartItems.length });
      } catch (e) {
        logStep("Failed to parse items_compact", { error: String(e) });
      }

      // Fetch full product details from Supabase
      const productIds = cartItems.map(item => item.id);
      const productMap = await fetchProductDetails(supabaseAdmin, productIds);
      
      // Enrich cart items with product details
      cartItems = cartItems.map(item => {
        const product = productMap.get(item.id);
        return {
          ...item,
          title: product?.title || `Product ${item.id}`,
          handle: product?.handle || '',
          image: product?.images?.[0]?.url || '',
          code_alsafix: alsafixCodeOnly(product?.code_alsafix),
          box_quantity: product?.box_quantity ?? null,
          variantTitle: 'Default',
        };
      });
      logStep("Enriched cart items with product details");

      // Get shipping details from PaymentIntent (if collected via Stripe Elements)
      // Note: For PaymentIntent flow, shipping is typically collected separately
      // We'll try to get it from the associated charges
      let shippingAddress: any = null;
      let customerName: string | null = null;
      let customerPhone: string | null = null;

      // Try to get shipping from the latest charge
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.shipping) {
            shippingAddress = charge.shipping.address;
            customerName = charge.shipping.name;
            logStep("Got shipping from charge", { address: shippingAddress, name: customerName });
          }
          customerPhone = charge.billing_details?.phone || null;
          if (customerPhone) {
            logStep("Got phone from charge billing details", { phone: customerPhone });
          }
        } catch (e) {
          logStep("Could not retrieve charge shipping", { error: String(e) });
        }
      }

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Create order in Supabase
      const stripeModeFromMetadata = metadata.stripe_mode === "test" ? "test" : "live";
      const insertPayload: Record<string, unknown> = {
        order_number: orderNumber,
        user_id: userId,
        user_email: userEmail,
        status: "paid",
        total_ht: totalHT,
        total_ttc: totalTTC,
        shipping_address: shippingAddress
          ? `${shippingAddress.line1 || ""}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}`
          : null,
        shipping_city: shippingAddress?.city || null,
        shipping_postal_code: shippingAddress?.postal_code || null,
        shipping_name: customerName,
        notes: `Stripe PaymentIntent: ${paymentIntent.id} | stripe_mode:${stripeModeFromMetadata}`,
      };
      if (orderSiteId) insertPayload.site_id = orderSiteId;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert(insertPayload as any)
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          variant_title: item.variantTitle || 'Default',
          product_image: item.image || null,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        await sendToN8n(
          n8nWebhookUrl,
          supabaseAdmin,
          orderNumber,
          order.id,
          paymentIntent.id,
          customerName,
          userEmail,
          customerPhone,
          shippingAddress,
          cartItems,
          totalHT,
          totalTTC
        );
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("PaymentIntent processing complete");
    }

    // Handle checkout.session.completed (kept for backwards compatibility)
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout session", { sessionId: session.id });

      // Check if order already exists with this Session ID
      const { data: existingOrder } = await supabaseAdmin
        .from("orders")
        .select("id, order_number, total_ht, total_ttc, user_email, shipping_address, shipping_city, shipping_postal_code, shipping_name")
        .ilike("notes", `%${session.id}%`)
        .maybeSingle();

      if (existingOrder) {
        logStep("Order already exists for this Checkout Session", { 
          orderId: existingOrder.id, 
          orderNumber: existingOrder.order_number 
        });

        // Get order items for n8n webhook
        const { data: existingItems } = await supabaseAdmin
          .from("order_items")
          .select("*")
          .eq("order_id", existingOrder.id);

        // Send webhook to n8n for fulfillment (even if order already exists)
        if (n8nWebhookUrl) {
          const cartItems = (existingItems || []).map(item => ({
            id: item.product_id,
            title: item.product_title,
            variantTitle: item.variant_title,
            image: item.product_image,
            quantity: item.quantity,
            priceHT: item.unit_price_ht,
          }));

          await sendToN8n(
            n8nWebhookUrl,
            supabaseAdmin,
            existingOrder.order_number,
            existingOrder.id,
            session.id,
            existingOrder.shipping_name,
            existingOrder.user_email,
            null, // phone
            existingOrder.shipping_address ? {
              line1: existingOrder.shipping_address,
              city: existingOrder.shipping_city,
              postal_code: existingOrder.shipping_postal_code,
            } : null,
            cartItems,
            existingOrder.total_ht,
            existingOrder.total_ttc
          );
        }

        logStep("Checkout session processing complete (existing order)");
        return new Response(JSON.stringify({ received: true, existing_order: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Get session details with line items
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['line_items', 'customer_details'],
      });

      const metadata = fullSession.metadata || {};
      const userId = metadata.user_id;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsJson = metadata.items_json;

      logStep("Session metadata", { userId, totalHT, totalTTC });

      const sessionOrderSiteId = await resolveOrderSiteId(supabaseAdmin, metadata as Record<string, string | undefined>);
      logStep("Resolved order site_id (checkout session)", { sessionOrderSiteId });

      // Parse cart items from metadata
      let cartItems: any[] = [];
      try {
        cartItems = JSON.parse(itemsJson || "[]");
      } catch (e) {
        logStep("Failed to parse items_json", { error: String(e) });
      }

      // Fetch full product details to get code_alsafix
      const productIds = cartItems.map(item => item.id);
      const productMap = await fetchProductDetails(supabaseAdmin, productIds);
      
      // Enrich cart items with code_alsafix
      cartItems = cartItems.map(item => {
        const product = productMap.get(item.id);
        return {
          ...item,
          code_alsafix: alsafixCodeOnly(product?.code_alsafix),
        };
      });

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Extract shipping address
      const shippingDetails = fullSession.shipping_details;
      const shippingAddress = shippingDetails?.address;

      // Extract customer email
      const customerEmail = fullSession.customer_details?.email || fullSession.customer_email || null;

      // Create order in Supabase
      const stripeModeFromSession = metadata.stripe_mode === "test" ? "test" : "live";
      const sessionInsert: Record<string, unknown> = {
        order_number: orderNumber,
        user_id: userId,
        user_email: customerEmail,
        status: "paid",
        total_ht: totalHT,
        total_ttc: totalTTC,
        shipping_address: shippingAddress
          ? `${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}`
          : null,
        shipping_city: shippingAddress?.city || null,
        shipping_postal_code: shippingAddress?.postal_code || null,
        notes: `Stripe Session: ${session.id} | stripe_mode:${stripeModeFromSession}`,
      };
      if (sessionOrderSiteId) sessionInsert.site_id = sessionOrderSiteId;

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert(sessionInsert as any)
        .select()
        .single();

      if (orderError) {
        logStep("Error creating order", { error: orderError.message });
        throw new Error(`Failed to create order: ${orderError.message}`);
      }

      logStep("Order created", { orderId: order.id, orderNumber });

      // Create order items
      if (cartItems.length > 0) {
        const orderItems = cartItems.map(item => ({
          order_id: order.id,
          product_id: item.id,
          product_title: item.title,
          variant_title: item.variantTitle,
          product_image: item.image,
          quantity: item.quantity,
          unit_price_ht: item.priceHT,
          unit_price_ttc: item.priceHT * 1.20,
        }));

        const { error: itemsError } = await supabaseAdmin
          .from("order_items")
          .insert(orderItems);

        if (itemsError) {
          logStep("Error creating order items", { error: itemsError.message });
        } else {
          logStep("Order items created", { count: orderItems.length });
        }
      }

      // Send webhook to n8n for fulfillment
      if (n8nWebhookUrl) {
        await sendToN8n(
          n8nWebhookUrl,
          supabaseAdmin,
          orderNumber,
          order.id,
          session.id,
          shippingDetails?.name || fullSession.customer_details?.name || null,
          customerEmail,
          fullSession.customer_details?.phone || null,
          shippingAddress ? {
            name: shippingDetails?.name || undefined,
            line1: shippingAddress.line1 || undefined,
            line2: shippingAddress.line2 || undefined,
            city: shippingAddress.city || undefined,
            postal_code: shippingAddress.postal_code || undefined,
            country: shippingAddress.country || undefined,
          } : null,
          cartItems,
          totalHT,
          totalTTC
        );
      } else {
        logStep("N8N_WEBHOOK_URL not configured, skipping fulfillment notification");
      }

      logStep("Checkout session processing complete");
    }

    return new Response(JSON.stringify({ received: true }), {
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

// Helper function to send to n8n and save document
async function sendToN8n(
  n8nWebhookUrl: string,
  supabaseAdmin: any,
  orderNumber: string,
  orderId: string,
  stripeId: string,
  customerName: string | null,
  customerEmail: string | null,
  customerPhone: string | null,
  shippingAddress: any,
  cartItems: any[],
  totalHT: number,
  totalTTC: number
) {
  try {
    // Get supplier settings
    const { data: supplierSettings } = await supabaseAdmin
      .from('supplier_settings')
      .select('*')
      .maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });

    // Get customer number from supplier settings (default to "000001")
    const customerNumber = supplierSettings?.customer_number || '000001';

    const enrichedCartItems = await enrichItemsWithAlsafixCodes(supabaseAdmin, cartItems);

    let resolvedPhone = customerPhone?.trim() || null;
    if (!resolvedPhone && orderId) {
      const { data: orderRow } = await supabaseAdmin
        .from("orders")
        .select("user_id")
        .eq("id", orderId)
        .maybeSingle();
      if (orderRow?.user_id) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("phone")
          .eq("user_id", orderRow.user_id)
          .maybeSingle();
        resolvedPhone = profile?.phone?.trim() || null;
      }
    }

    // Generate PDF recap file (replaces Excel for Deno Edge compatibility)
    const pdfBase64 = generateOrderPDF(
      orderNumber,
      customerName || '',
      customerEmail || '',
      customerNumber,
      enrichedCartItems,
      shippingAddress ? {
        name: shippingAddress.name || customerName || undefined,
        line1: shippingAddress.line1 || undefined,
        line2: shippingAddress.line2 || undefined,
        city: shippingAddress.city || undefined,
        postal_code: shippingAddress.postal_code || undefined,
      } : null,
      resolvedPhone,
    );

    logStep("PDF file generated", { size: pdfBase64.length });

    const { productsHT, shippingHT } = splitOrderTotals(enrichedCartItems, totalHT);
    const fromEmail = supplierSettings?.customer_service_email || supplierSettings?.email;
    if (fromEmail && customerEmail) {
      const shippingName = shippingAddress?.name || customerName;
      const shippingLine = [shippingAddress?.line1, shippingAddress?.line2].filter(Boolean).join(", ") || null;
      const shippingCityLine = shippingAddress?.postal_code && shippingAddress?.city
        ? `${shippingAddress.postal_code} ${shippingAddress.city}`
        : shippingAddress?.city || null;

      await sendOrderConfirmationEmail({
        customerEmail,
        fromEmail,
        fromName: supplierSettings?.name || "Vis-à-Bois",
        bccEmail: supplierSettings?.status_email || null,
        orderNumber,
        items: enrichedCartItems.map((item) => ({
          title: item.title || item.product_title || "",
          variantTitle: item.variantTitle || item.variant_title || null,
          quantity: item.quantity || item.q || 1,
          unit_price_ht: item.priceHT || item.unit_price_ht || 0,
          boxQuantity: (item.box_quantity ?? item.boxQuantity ?? null) as number | null,
        })),
        productsHT,
        shippingHT,
        totalHT,
        totalTTC,
        shippingName,
        shippingAddress: shippingLine,
        shippingCityLine,
      });
    } else {
      logStep("Skipping customer confirmation email", { hasFrom: !!fromEmail, hasCustomerEmail: !!customerEmail });
    }

    // Upload PDF to Supabase Storage and update order documents
    const pdfFileName = `commande_${orderNumber}.pdf`;
    const filePath = `${orderId}/${pdfFileName}`;
    
    try {
      // Decode base64 and upload to storage
      const binaryString = atob(pdfBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const { error: uploadError } = await supabaseAdmin.storage
        .from('order-documents')
        .upload(filePath, bytes, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) {
        logStep("Error uploading PDF to storage", { error: uploadError.message });
      } else {
        logStep("PDF uploaded to storage", { filePath });

        // Create signed URL for the document (valid for 1 year)
        const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
          .from('order-documents')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365);

        if (signedUrlError) {
          logStep("Error creating signed URL", { error: signedUrlError.message });
        } else {
          // Update order with document reference
          const newDocument = {
            name: pdfFileName,
            type: 'order_confirmation',
            url: signedUrlData.signedUrl,
            created_at: new Date().toISOString(),
            status: 'paid'
          };

          // Get current documents array
          const { data: currentOrder } = await supabaseAdmin
            .from('orders')
            .select('documents')
            .eq('id', orderId)
            .single();

          const existingDocuments = currentOrder?.documents || [];
          const updatedDocuments = [...existingDocuments, newDocument];

          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ documents: updatedDocuments })
            .eq('id', orderId);

          if (updateError) {
            logStep("Error updating order with document", { error: updateError.message });
          } else {
            logStep("Order updated with document reference", { documentCount: updatedDocuments.length });
          }
        }
      }
    } catch (storageError) {
      logStep("Storage operation failed", { error: String(storageError) });
    }

    const n8nPayload = {
      event: "order.paid",
      order_number: orderNumber,
      order_id: orderId,
      stripe_id: stripeId,
      customer: {
        email: customerEmail,
        phone: customerPhone,
        name: customerName,
        shipping_address: shippingAddress,
      },
      supplier: supplierSettings ? {
        name: supplierSettings.name || null,
        email: supplierSettings.email || null,
        status_email: supplierSettings.status_email || null,
        address: supplierSettings.address || null,
        postal_code: supplierSettings.postal_code || null,
        city: supplierSettings.city || null,
        phone: supplierSettings.phone || null,
      } : null,
      items: enrichedCartItems.map(item => ({
        product_id: item.id || item.product_id,
        code_alsafix: item.code_alsafix || '',
        variant_id: item.variantId || item.id,
        title: item.title || item.product_title,
        variant_title: item.variantTitle || 'Default',
        quantity: item.quantity || item.q || 1,
        unit_price_ht: item.priceHT || item.unit_price_ht || 0,
        unit_price_ttc: (item.priceHT || item.unit_price_ht || 0) * 1.20,
      })),
      totals: {
        ht: totalHT,
        ttc: totalTTC,
        products_ht: productsHT,
        shipping_ht: shippingHT,
        currency: "EUR",
      },
      // PDF file as base64 (replaces excel_file for Deno Edge compatibility)
      pdf_file: {
        filename: pdfFileName,
        content_base64: pdfBase64,
        content_type: "application/pdf",
      },
      created_at: new Date().toISOString(),
    };

    logStep("Sending to n8n", { url: n8nWebhookUrl });

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    logStep("n8n response", { status: n8nResponse.status });
  } catch (n8nError) {
    logStep("n8n webhook failed (non-blocking)", { error: String(n8nError) });
  }
}
