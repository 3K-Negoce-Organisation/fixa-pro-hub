-- Create storage bucket for order documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-documents', 'order-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for order-documents bucket
CREATE POLICY "Admins can manage order documents"
ON storage.objects
FOR ALL
USING (bucket_id = 'order-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their order documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'order-documents' 
  AND EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.user_id = auth.uid() 
    AND storage.objects.name LIKE orders.order_number || '/%'
  )
);

CREATE POLICY "Service role can upload order documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'order-documents');

-- Add documents column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;