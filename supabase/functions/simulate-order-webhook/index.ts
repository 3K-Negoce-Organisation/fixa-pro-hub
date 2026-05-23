import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { splitOrderTotals } from "../_shared/order-totals.ts";
import { sendOrderConfirmationEmail } from "../_shared/send-order-confirmation-email.ts";
import { enrichItemsWithAlsafixCodes } from "../_shared/alsafix-code.ts";
import { generateOrderPDF } from "../_shared/generate-order-pdf.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SIMULATE-WEBHOOK] ${step}${detailsStr}`);
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');

    // Verify admin authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check admin role
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id, preview_only } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logStep("Simulating webhook for order", { order_id });

    // Get order details
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

    // Get order items
    const { data: orderItems } = await supabaseAdmin
      .from('order_items')
      .select('*')
      .eq('order_id', order_id);

    // Enrich order items with code Alsafix from products table
    const enrichedItems = await enrichItemsWithAlsafixCodes(
      supabaseAdmin,
      orderItems || [],
    );

    // Get user info
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    const customerEmail = userData?.user?.email || '';
    const customerName = userData?.user?.user_metadata?.full_name || '';

    // Get profile for more details
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('company_name, phone')
      .eq('user_id', order.user_id)
      .maybeSingle();

    const displayName = profile?.company_name || customerName || customerEmail;

    // Get supplier settings
    const { data: supplierSettings } = await supabaseAdmin
      .from('supplier_settings')
      .select('*')
      .maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });
    
    // Get customer number from supplier settings (default to "000001")
    const customerNumber = supplierSettings?.customer_number || '000001';

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'N8N_WEBHOOK_URL non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate PDF file
    const pdfBase64 = generateOrderPDF(
      order.order_number,
      displayName,
      customerEmail,
      customerNumber,
      enrichedItems,
      order.total_ht,
      order.total_ttc,
      {
        name: order.shipping_name || undefined,
        line1: order.shipping_address || undefined,
        city: order.shipping_city || undefined,
        postal_code: order.shipping_postal_code || undefined,
      }
    );

    logStep("PDF file generated", { size: pdfBase64.length, preview_only: !!preview_only });

    const pdfFileName = `commande_${order.order_number}.pdf`;

    if (preview_only) {
      return new Response(
        JSON.stringify({
          preview: true,
          order_number: order.order_number,
          pdf_file: {
            filename: pdfFileName,
            content_base64: pdfBase64,
            content_type: "application/pdf",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { productsHT, shippingHT } = splitOrderTotals(enrichedItems, order.total_ht);
    const fromEmail = supplierSettings?.customer_service_email || supplierSettings?.email;
    if (fromEmail && customerEmail) {
      await sendOrderConfirmationEmail({
        customerEmail,
        fromEmail,
        fromName: supplierSettings?.name || "Vis-à-Bois",
        bccEmail: supplierSettings?.status_email || null,
        orderNumber: order.order_number,
        items: enrichedItems.map((item) => ({
          title: item.product_title || "",
          variantTitle: item.variant_title || null,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht || 0,
        })),
        productsHT,
        shippingHT,
        totalHT: order.total_ht,
        totalTTC: order.total_ttc,
        shippingName: order.shipping_name,
        shippingAddress: order.shipping_address,
        shippingCityLine: order.shipping_postal_code && order.shipping_city
          ? `${order.shipping_postal_code} ${order.shipping_city}`
          : order.shipping_city,
      });
    }

    // Store PDF in order-documents bucket
    const pdfPath = `${order.id}/${pdfFileName}`;
    
    // Decode base64 to binary
    const binaryString = atob(pdfBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from('order-documents')
      .upload(pdfPath, bytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      logStep("Error uploading PDF to storage", { error: uploadError.message });
    } else {
      logStep("PDF uploaded to storage", { path: pdfPath });

      // Generate signed URL (valid for 1 year)
      const { data: signedUrlData } = await supabaseAdmin.storage
        .from('order-documents')
        .createSignedUrl(pdfPath, 60 * 60 * 24 * 365);

      if (signedUrlData?.signedUrl) {
        // Get existing documents
        const existingDocs = Array.isArray(order.documents) ? order.documents : [];
        
        // Check if this document already exists (avoid duplicates)
        const docExists = existingDocs.some((doc: any) => doc.name === pdfFileName);
        
        if (!docExists) {
          const newDocument = {
            name: pdfFileName,
            path: pdfPath,
            url: signedUrlData.signedUrl,
            type: 'application/pdf',
            uploaded_at: new Date().toISOString(),
          };

          // Update order with new document
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({
              documents: [...existingDocs, newDocument],
            })
            .eq('id', order.id);

          if (updateError) {
            logStep("Error updating order documents", { error: updateError.message });
          } else {
            logStep("Order documents updated", { docCount: existingDocs.length + 1 });
          }
        } else {
          logStep("Document already exists, skipping", { name: pdfFileName });
        }
      }
    }

    // Build n8n payload
    const n8nPayload = {
      event: "order.paid",
      order_number: order.order_number,
      order_id: order.id,
      simulation: true,
      customer: {
        email: customerEmail,
        phone: profile?.phone || null,
        name: displayName,
        shipping_address: {
          line1: order.shipping_address,
          city: order.shipping_city,
          postal_code: order.shipping_postal_code,
          country: 'FR',
        },
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
      items: enrichedItems.map(item => ({
        product_id: item.product_id,
        code_alsafix: item.code_alsafix || '',
        title: item.product_title,
        variant_title: item.variant_title,
        quantity: item.quantity,
        unit_price_ht: item.unit_price_ht,
        unit_price_ttc: item.unit_price_ttc,
      })),
      totals: {
        ht: order.total_ht,
        ttc: order.total_ttc,
        products_ht: productsHT,
        shipping_ht: shippingHT,
        currency: "EUR",
      },
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

    const responseStatus = n8nResponse.status;
    let responseBody = '';
    try {
      responseBody = await n8nResponse.text();
    } catch (e) {
      // ignore
    }

    logStep("n8n response", { status: responseStatus, body: responseBody.substring(0, 200) });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Webhook n8n envoyé (status: ${responseStatus})`,
        n8n_status: responseStatus,
        order_number: order.order_number,
        pdf_file: {
          filename: pdfFileName,
          content_base64: pdfBase64,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
