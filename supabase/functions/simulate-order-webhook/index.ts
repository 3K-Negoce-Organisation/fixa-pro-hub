import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.2";
import { splitOrderTotals } from "../_shared/order-totals.ts";
import { sendOrderConfirmationEmail } from "../_shared/send-order-confirmation-email.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SIMULATE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate PDF order recap file matching the template format with full styling
function generateOrderPDF(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: any[],
  totalHT: number,
  totalTTC: number,
  shippingAddress: { name?: string; line1?: string; line2?: string; city?: string; postal_code?: string } | null
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  const { shippingHT } = splitOrderTotals(items, totalHT);

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
    const totalItemHT = (item.unit_price_ht || 0) * item.quantity;
    return [
      item.code_alsafix || item.product_id || '',
      item.product_title || '',
      String(item.quantity),
      `${(item.unit_price_ht || 0).toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`
    ];
  });

  if (shippingHT > 0) {
    tableData.push([
      '',
      'Frais de livraison',
      '1',
      `${shippingHT.toFixed(2)} €`,
      `${shippingHT.toFixed(2)} €`,
    ]);
  }

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
  doc.text('TOTAL TTC', margin + 130, totalRowY + 7);
  doc.text(`${totalTTC.toFixed(2)} €`, pageWidth - margin - 10, totalRowY + 7, { align: 'right' });

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

    const { order_id } = await req.json();

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

    // Get product codes (code_alsafix) for each item by matching on product_title
    const productTitles = (orderItems || []).map(item => item.product_title);
    const { data: products } = await supabaseAdmin
      .from('products')
      .select('id, title, code_alsafix')
      .in('title', productTitles);

    // Create a map of product_title to code_alsafix
    const productCodeMap = new Map<string, string>();
    (products || []).forEach(p => {
      if (p.code_alsafix) {
        productCodeMap.set(p.title, p.code_alsafix);
      }
    });

    // Enrich order items with code_alsafix (matched by title)
    const enrichedItems = (orderItems || []).map(item => ({
      ...item,
      code_alsafix: productCodeMap.get(item.product_title) || item.product_id,
    }));

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

    logStep("PDF file generated", { size: pdfBase64.length });

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
    const pdfFileName = `commande_${order.order_number}.pdf`;
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
      items: (orderItems || []).map(item => ({
        product_id: item.product_id,
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
