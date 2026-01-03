import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      api_key, 
      order_number, 
      status, 
      tracking_number, 
      carrier,
      document_base64,
      document_name,
      document_type 
    } = await req.json();

    // Validate API key
    const expectedApiKey = Deno.env.get('ORDER_UPDATE_API_KEY');
    if (!expectedApiKey || api_key !== expectedApiKey) {
      console.error('Invalid API key provided');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!order_number) {
      return new Response(
        JSON.stringify({ error: 'order_number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate status if provided
    const validStatuses = ['pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tracking_number and carrier are required for "shipped" status
    if (status === 'shipped') {
      if (!tracking_number) {
        return new Response(
          JSON.stringify({ error: 'tracking_number is required when status is "shipped"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!carrier) {
        return new Response(
          JSON.stringify({ error: 'carrier is required when status is "shipped"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate document fields if document is provided
    if (document_base64 && !document_name) {
      return new Response(
        JSON.stringify({ error: 'document_name is required when uploading a document' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if order exists
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, order_number, status, documents')
      .eq('order_number', order_number.toUpperCase())
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching order:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error fetching order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!existingOrder) {
      return new Response(
        JSON.stringify({ error: `Order not found: ${order_number}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (status) updateData.status = status;
    if (tracking_number !== undefined) updateData.tracking_number = tracking_number;
    if (carrier !== undefined) updateData.carrier = carrier;

    // Handle document upload if provided
    let uploadedDocumentUrl: string | null = null;
    if (document_base64) {
      try {
        console.log(`Uploading document: ${document_name} for order ${order_number}`);
        
        // Decode base64 to binary
        const binaryString = atob(document_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Determine content type
        const contentType = document_type || 'application/pdf';
        
        // Generate unique filename
        const timestamp = Date.now();
        const sanitizedName = document_name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${order_number.toUpperCase()}/${timestamp}_${sanitizedName}`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('order-documents')
          .upload(filePath, bytes, {
            contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('Error uploading document:', uploadError);
          return new Response(
            JSON.stringify({ error: 'Error uploading document', details: uploadError.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`Document uploaded successfully: ${uploadData.path}`);

        // Get signed URL for the document (valid for 1 year)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('order-documents')
          .createSignedUrl(filePath, 31536000); // 1 year in seconds

        if (signedUrlError) {
          console.error('Error creating signed URL:', signedUrlError);
        }

        uploadedDocumentUrl = signedUrlData?.signedUrl || filePath;

        // Add document to existing documents array
        const existingDocuments = existingOrder.documents || [];
        const newDocument = {
          name: document_name,
          path: filePath,
          url: uploadedDocumentUrl,
          type: contentType,
          uploaded_at: new Date().toISOString(),
        };
        
        updateData.documents = [...existingDocuments, newDocument];
        console.log(`Document added to order. Total documents: ${(updateData.documents as unknown[]).length}`);
        
      } catch (docError) {
        console.error('Error processing document:', docError);
        return new Response(
          JSON.stringify({ error: 'Error processing document', details: String(docError) }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', existingOrder.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Error updating order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Order ${order_number} updated successfully:`, {
      status: updateData.status,
      tracking_number: updateData.tracking_number,
      carrier: updateData.carrier,
      document_uploaded: !!uploadedDocumentUrl,
    });

    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder,
        message: `Order ${order_number} updated successfully`,
        document_url: uploadedDocumentUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
