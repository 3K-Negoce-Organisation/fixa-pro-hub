import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SIMULATE-WEBHOOK] ${step}${detailsStr}`);
};

// Generate Excel order recap file matching the template format
function generateOrderExcel(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerNumber: string,
  items: any[],
  totalHT: number,
  shippingAddress: { line1?: string; line2?: string; city?: string; postal_code?: string } | null
): string {
  const date = new Date();
  const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
  
  // Customer name in uppercase for column G
  const customerNameUpper = (customerName || customerEmail).toUpperCase();
  
  // Build worksheet data - matching template format
  const wsData: any[][] = [
    [dateStr, '', '', '', '', '', `clt ${customerNameUpper}`],
    ['commande', orderNumber, '', '', '', '', `N° clt ${customerNumber}`],
    ['', '', '', '', '', '', ''],
    ['code', 'désignation', 'quantité', 'Prix au conditionnment', 'Prix total HT net', '', ''],
  ];

  // Add items with code_alsafix
  items.forEach(item => {
    const totalItemHT = (item.unit_price_ht || 0) * item.quantity;
    wsData.push([
      item.code_alsafix || item.product_id || '',
      item.product_title || '',
      item.quantity,
      `${(item.unit_price_ht || 0).toFixed(2)} €`,
      `${totalItemHT.toFixed(2)} €`,
      '',
      ''
    ]);
  });

  // Add total row
  wsData.push(['', '', '', '', `${totalHT.toFixed(2)} €`, '', '']);
  
  // Add shipping address section
  wsData.push(['Adresse de livraison', '', '', '', '', '', '']);
  if (shippingAddress) {
    wsData.push(['', customerName || '', '', '', '', '', '']);
    if (shippingAddress.line1) wsData.push(['', shippingAddress.line1, '', '', '', '', '']);
    if (shippingAddress.line2) wsData.push(['', shippingAddress.line2, '', '', '', '', '']);
    if (shippingAddress.postal_code || shippingAddress.city) {
      wsData.push(['', `${shippingAddress.postal_code || ''} ${shippingAddress.city || ''}`.trim(), '', '', '', '', '']);
    }
  }
  wsData.push(['', '', '', '', '', '', '']);
  wsData.push(['', '', '', '', '', '', '']);
  wsData.push(['Livraison direct sans BL chiffré', '', '', '', '', '', '']);

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths to match template exactly (in characters)
  ws['!cols'] = [
    { wch: 12 },   // A: code
    { wch: 32 },   // B: désignation
    { wch: 8 },    // C: quantité
    { wch: 20 },   // D: Prix au conditionnment
    { wch: 16 },   // E: Prix total HT net
    { wch: 2 },    // F: empty spacer
    { wch: 14 },   // G: clt info
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Commande');
  
  // Generate base64
  const xlsxBuffer = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  return xlsxBuffer;
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
    // Since order_items.product_id may contain Shopify IDs, we match by title instead
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
    
    // Use "00000" as default customer number (matching template)
    const customerNumber = '00000';

    // Get supplier settings
    const { data: supplierSettings } = await supabaseAdmin
      .from('supplier_settings')
      .select('*')
      .maybeSingle();

    logStep("Supplier settings fetched", { hasSettings: !!supplierSettings });

    if (!n8nWebhookUrl) {
      return new Response(
        JSON.stringify({ error: 'N8N_WEBHOOK_URL non configuré' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate Excel file
    const excelBase64 = generateOrderExcel(
      order.order_number,
      displayName,
      customerEmail,
      customerNumber,
      enrichedItems,
      order.total_ht,
      {
        line1: order.shipping_address || undefined,
        city: order.shipping_city || undefined,
        postal_code: order.shipping_postal_code || undefined,
      }
    );

    logStep("Excel file generated", { size: excelBase64.length });

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
        currency: "EUR",
      },
      excel_file: {
        filename: `commande_${order.order_number}.xlsx`,
        content_base64: excelBase64,
        content_type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
        excel_file: {
          filename: `commande_${order.order_number}.xlsx`,
          content_base64: excelBase64,
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
