import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { splitOrderTotals } from "../_shared/order-totals.ts";
import { sendOrderConfirmationEmail } from "../_shared/send-order-confirmation-email.ts";
import { buildOrderTrackingUrlForEmail } from "../_shared/guest-order-tracking-url.ts";
import { resolveResendFrom } from "../_shared/resolve-resend-from.ts";
import { resolveSiteLogoUrlForEmail } from "../_shared/site-logo.ts";
import { enrichItemsWithAlsafixCodes } from "../_shared/alsafix-code.ts";
import { orderItemRowToEnrichmentLine } from "../_shared/order-item-snapshot.ts";
import { generateOrderPDF } from "../_shared/generate-order-pdf.ts";
import { loadSupplierDocumentLogo } from "../_shared/site-logo.ts";
import { resolveOrderCustomerPhone } from "../_shared/order-customer-phone.ts";
import { resolveOrderCustomerEmail } from "../_shared/order-customer-email.ts";
import { insertOrderStatusEvent } from "../_shared/order-status-events.ts";
import { supplierPoContactEmail } from "../_shared/supplier-contact-email.ts";
import {
  resolveSiteSlug,
  resolveStorefrontUrlForSiteId,
  storefrontHostForSlug,
} from "../_shared/storefront-url.ts";

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

    // Verify admin authorization (JWT admin) or internal marketplace fulfillment.
    const authHeader = req.headers.get('Authorization');
    const internalKey = req.headers.get('x-marketplace-internal');
    const expectedInternalKey =
      Deno.env.get('MARKETPLACE_HUB_API_KEY') ?? Deno.env.get('VAB_API_KEY');
    const isInternalMarketplaceFulfillment =
      !!expectedInternalKey
      && !!internalKey
      && internalKey === expectedInternalKey
      && authHeader?.startsWith('Bearer ');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    let adminUserId: string | null = null;

    if (isInternalMarketplaceFulfillment) {
      adminUserId = null;
    } else {
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

      adminUserId = user.id;
    }

    const { order_id, preview_only, record_manual_event, manual_note, skip_customer_email, skip_n8n } = await req.json();

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
      (orderItems || []).map((item) => orderItemRowToEnrichmentLine(item as Record<string, unknown>)),
    );

    // Get user info (guest orders may not exist in auth.users)
    let customerEmail = order.user_email || '';
    let customerName = '';
    if (order.user_id) {
      try {
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
        customerEmail = userData?.user?.email || customerEmail;
        customerName = userData?.user?.user_metadata?.full_name || '';
      } catch (userLookupError) {
        logStep("Could not load auth user for order", {
          user_id: order.user_id,
          error: userLookupError instanceof Error ? userLookupError.message : String(userLookupError),
        });
      }
    }
    customerEmail = await resolveOrderCustomerEmail(supabaseAdmin, order, customerEmail);

    // Get profile for more details
    let profile: { company_name?: string | null; phone?: string | null } | null = null;
    if (order.user_id) {
      const { data: profileData } = await supabaseAdmin
        .from('profiles')
        .select('company_name, phone')
        .eq('user_id', order.user_id)
        .maybeSingle();
      profile = profileData;
    }

    const displayName = profile?.company_name || customerName || customerEmail;
    const customerPhone = await resolveOrderCustomerPhone(supabaseAdmin, order);
    logStep("Resolved customer phone", { hasPhone: !!customerPhone, orderNumber: order.order_number });

    // Get supplier settings
    let supplierSettingsQuery = supabaseAdmin.from('supplier_settings').select('*');
    if (order.site_id) {
      supplierSettingsQuery = supplierSettingsQuery.eq('site_id', order.site_id);
    }
    const { data: supplierSettings } = await supplierSettingsQuery.maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });
    
    // Get customer number from supplier settings (default to "000001")
    const customerNumber = supplierSettings?.customer_number || '000001';
    const supplierContactEmail = supplierPoContactEmail(supplierSettings);

    if (!preview_only && !skip_n8n && !n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'N8N_WEBHOOK_URL non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const skipClientEmail = skip_customer_email === true || skip_n8n === true;
    const storeOnly = skip_n8n === true;

    // Generate PDF file
    const siteLogo = loadSupplierDocumentLogo();
    logStep("Resolved supplier PDF logo", { brand: "3K-Négoce", hasLogo: !!siteLogo });
    const pdfBase64 = generateOrderPDF(
      order.order_number,
      displayName,
      customerEmail,
      customerNumber,
      enrichedItems,
      {
        name: order.shipping_name || undefined,
        line1: order.shipping_address || undefined,
        city: order.shipping_city || undefined,
        postal_code: order.shipping_postal_code || undefined,
      },
      customerPhone || profile?.phone || null,
      siteLogo,
      supplierContactEmail || null,
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
    if (!preview_only && !skipClientEmail && (fromEmail || Deno.env.get("RESEND_FROM_EMAIL")) && customerEmail) {
      const siteSlug = await resolveSiteSlug(supabaseAdmin, order.site_id ?? null);
      const storefrontBase = await resolveStorefrontUrlForSiteId(supabaseAdmin, order.site_id ?? null);
      const trackingUrl = await buildOrderTrackingUrlForEmail(order.order_number, customerEmail, storefrontBase);

      const { fromEmail: resendFrom, fromName, replyTo } = resolveResendFrom(supplierSettings, {
        siteSlug,
      });
      const logoUrl = await resolveSiteLogoUrlForEmail(supabaseAdmin, order.site_id ?? null);

      await sendOrderConfirmationEmail({
        customerEmail,
        fromEmail: resendFrom,
        fromName,
        replyTo,
        logoUrl,
        storefrontHost: storefrontHostForSlug(siteSlug),
        bccEmail: supplierSettings?.status_email || null,
        orderNumber: order.order_number,
        items: enrichedItems.map((item) => ({
          title: item.product_title || "",
          variantTitle: item.variant_title || null,
          quantity: item.quantity,
          unit_price_ht: item.unit_price_ht || 0,
          boxQuantity: (item.box_quantity ?? item.boxQuantity ?? null) as number | null,
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
        trackingUrl,
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
        cacheControl: '0',
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
        const existingDocs = Array.isArray(order.documents) ? [...order.documents] : [];
        
        const newDocument = {
          name: pdfFileName,
          path: pdfPath,
          url: signedUrlData.signedUrl,
          type: 'application/pdf',
          uploaded_at: new Date().toISOString(),
          source: storeOnly ? 'regenerate_cmd' : 'simulate-order-webhook',
        };

        const existingIdx = existingDocs.findIndex((doc: { name?: string; path?: string }) =>
          doc?.name === pdfFileName || doc?.path === pdfPath
        );

        if (existingIdx >= 0) {
          existingDocs[existingIdx] = newDocument;
          logStep("Document replaced in order.documents", { name: pdfFileName });
        } else {
          existingDocs.push(newDocument);
          logStep("Document appended to order.documents", { name: pdfFileName });
        }

        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            documents: existingDocs,
          })
          .eq('id', order.id);

        if (updateError) {
          logStep("Error updating order documents", { error: updateError.message });
        } else {
          logStep("Order documents updated", { docCount: existingDocs.length });
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
        email: supplierContactEmail || null,
        phone: customerPhone || profile?.phone || null,
        name: displayName,
        shipping_address: {
          name: order.shipping_name || displayName,
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

    if (storeOnly) {
      logStep("skip_n8n: PDF stocké sans envoi fournisseur", { order_number: order.order_number });

      if (record_manual_event && adminUserId) {
        await insertOrderStatusEvent(supabaseAdmin, {
          order_id: order.id,
          status: order.status,
          event_kind: "manual_cmd",
          is_manual: true,
          note: manual_note || "Régénération CMD fournisseur (sans envoi)",
          document: {
            name: pdfFileName,
            path: pdfPath,
            type: "renvoi",
          },
          created_by: adminUserId,
        });
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "CMD régénérée et stockée (non envoyée au fournisseur)",
          skip_n8n: true,
          order_number: order.order_number,
          pdf_file: {
            filename: pdfFileName,
            content_base64: pdfBase64,
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logStep("Sending to n8n", { url: n8nWebhookUrl });

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'N8N_WEBHOOK_URL non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

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

    if (record_manual_event && adminUserId) {
      await insertOrderStatusEvent(supabaseAdmin, {
        order_id: order.id,
        status: order.status,
        event_kind: "manual_cmd",
        is_manual: true,
        note: manual_note || "Régénération CMD fournisseur",
        document: {
          name: pdfFileName,
          path: pdfPath,
          type: "renvoi",
        },
        created_by: adminUserId,
      });
    }

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
