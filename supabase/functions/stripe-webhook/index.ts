import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";

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

// Generate PDF order recap file matching the template format with full styling
function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: any[],
  totalHT: number,
  shippingAddress: { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string } | null
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  
  // Customer name in uppercase
  const customerNameUpper = (customerName || customerEmail).toUpperCase();
  
  // Create PDF document (A4 landscape for better table fit)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colors (typed as tuples)
  const headerBlue: [number, number, number] = [30, 58, 95]; // #1E3A5F
  const totalGreen: [number, number, number] = [212, 237, 218]; // #D4EDDA
  const infoDarkBlue = [25, 50, 85];

  // Header section - Date and Customer info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, margin, 15);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`clt ${customerNameUpper}`, pageWidth - margin, 15, { align: 'right' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('commande', margin, 22);
  doc.setFont('helvetica', 'bold');
  doc.text(orderNumber, margin + 25, 22);
  
  doc.setTextColor(infoDarkBlue[0], infoDarkBlue[1], infoDarkBlue[2]);
  doc.text(`N° clt ${customerNumber}`, pageWidth - margin, 22, { align: 'right' });
  doc.setTextColor(0, 0, 0);

  // Prepare table data
  const tableHeaders = [['Code', 'Désignation', 'Qté', 'Prix au conditionnement', 'Prix total HT net']];
  
  const tableData = items.map(item => {
    const priceHT = item.priceHT || item.unit_price_ht || 0;
    const qty = item.quantity || item.q || 1;
    const totalItemHT = priceHT * qty;
    return [
      item.code_alsafix || item.id || item.product_id || '',
      item.title || item.product_title || '',
      String(qty),
      `${priceHT.toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`
    ];
  });

  // Add table with styling
  autoTable(doc, {
    startY: 30,
    head: tableHeaders,
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 3,
      lineColor: [0, 0, 0],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: headerBlue,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 30 },  // Code
      1: { cellWidth: 80 },  // Désignation
      2: { cellWidth: 20, halign: 'center' },  // Qté
      3: { cellWidth: 45, halign: 'right' },   // Prix unitaire
      4: { cellWidth: 45, halign: 'right' },   // Prix total
    },
    didParseCell: function(data) {
      // Style for body rows
      if (data.section === 'body') {
        data.cell.styles.fillColor = [255, 255, 255];
      }
    },
  });

  // Get Y position after table
  const finalY = (doc as any).lastAutoTable.finalY || 100;

  // Total row with green background
  const totalRowY = finalY + 2;
  doc.setFillColor(totalGreen[0], totalGreen[1], totalGreen[2]);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(margin, totalRowY, pageWidth - 2 * margin, 10, 'S');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL HT', margin + 130, totalRowY + 7);
  doc.text(`${totalHT.toFixed(2)} €`, pageWidth - margin - 10, totalRowY + 7, { align: 'right' });

  // Shipping address section
  const addressY = totalRowY + 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Adresse de livraison', margin, addressY);
  
  doc.setFont('helvetica', 'normal');
  let currentY = addressY + 6;
  
  if (shippingAddress) {
    // Use shipping name if available, otherwise fall back to customerName
    const displayShippingName = shippingAddress.name || customerName;
    if (displayShippingName) {
      doc.text(displayShippingName, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line1) {
      doc.text(shippingAddress.line1, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, margin + 10, currentY);
      currentY += 5;
    }
    if (shippingAddress.postal_code || shippingAddress.city) {
      doc.text(`${shippingAddress.postal_code || ''} ${shippingAddress.city || ''}`.trim(), margin + 10, currentY);
      currentY += 5;
    }
  }

  // Footer note
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Livraison direct sans BL chiffré', margin, currentY);

  // Generate base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

// Fetch full product details from Supabase
async function fetchProductDetails(supabaseAdmin: any, productIds: string[]): Promise<Map<string, any>> {
  const productMap = new Map();
  
  if (productIds.length === 0) return productMap;
  
  const { data: products, error } = await supabaseAdmin
    .from('products')
    .select('id, title, handle, images, code_alsafix')
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");

    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No Stripe signature found");

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      logStep("Webhook signature verification failed", { error: message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

      const metadata = paymentIntent.metadata || {};
      const userId = metadata.user_id !== "guest" ? metadata.user_id : null;
      const userEmail = metadata.user_email || null;
      const totalHT = parseFloat(metadata.total_ht || "0");
      const totalTTC = parseFloat(metadata.total_ttc || "0");
      const itemsCompact = metadata.items_compact;

      logStep("PaymentIntent metadata", { userId, userEmail, totalHT, totalTTC });

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
          code_alsafix: product?.code_alsafix || item.id,
          variantTitle: 'Default',
        };
      });
      logStep("Enriched cart items with product details");

      // Get shipping details from PaymentIntent (if collected via Stripe Elements)
      // Note: For PaymentIntent flow, shipping is typically collected separately
      // We'll try to get it from the associated charges
      let shippingAddress: any = null;
      let customerName: string | null = null;

      // Try to get shipping from the latest charge
      if (paymentIntent.latest_charge) {
        try {
          const charge = await stripe.charges.retrieve(paymentIntent.latest_charge as string);
          if (charge.shipping) {
            shippingAddress = charge.shipping.address;
            customerName = charge.shipping.name;
            logStep("Got shipping from charge", { address: shippingAddress, name: customerName });
          }
        } catch (e) {
          logStep("Could not retrieve charge shipping", { error: String(e) });
        }
      }

      // Generate order number
      const orderNumber = generateOrderNumber();
      logStep("Generated order number", { orderNumber });

      // Create order in Supabase
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          user_email: userEmail,
          status: "paid",
          total_ht: totalHT,
          total_ttc: totalTTC,
          shipping_address: shippingAddress 
            ? `${shippingAddress.line1 || ''}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}`
            : null,
          shipping_city: shippingAddress?.city || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          shipping_name: customerName,
          notes: `Stripe PaymentIntent: ${paymentIntent.id}`,
        })
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
          null, // phone
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
          code_alsafix: product?.code_alsafix || item.id,
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
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          order_number: orderNumber,
          user_id: userId,
          user_email: customerEmail,
          status: "paid",
          total_ht: totalHT,
          total_ttc: totalTTC,
          shipping_address: shippingAddress 
            ? `${shippingAddress.line1}${shippingAddress.line2 ? ', ' + shippingAddress.line2 : ''}`
            : null,
          shipping_city: shippingAddress?.city || null,
          shipping_postal_code: shippingAddress?.postal_code || null,
          notes: `Stripe Session: ${session.id}`,
        })
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

// Helper function to send to n8n
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

    // Generate PDF recap file (replaces Excel for Deno Edge compatibility)
    const pdfBase64 = generateOrderPDF(
      orderNumber,
      customerName || '',
      customerEmail || '',
      customerNumber,
      cartItems,
      totalHT,
      shippingAddress ? {
        name: shippingAddress.name || customerName || undefined,
        line1: shippingAddress.line1 || undefined,
        line2: shippingAddress.line2 || undefined,
        city: shippingAddress.city || undefined,
        postal_code: shippingAddress.postal_code || undefined,
      } : null
    );

    logStep("PDF file generated", { size: pdfBase64.length });

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
      items: cartItems.map(item => ({
        product_id: item.id || item.product_id,
        code_alsafix: item.code_alsafix || item.id,
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
        currency: "EUR",
      },
      // PDF file as base64 (replaces excel_file for Deno Edge compatibility)
      pdf_file: {
        filename: `commande_${orderNumber}.pdf`,
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
