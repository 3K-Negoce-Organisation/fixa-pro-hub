-- Les PDF commande (stripe-webhook) et ARC n8n (admin) sont stockés sous {order.id}/…
-- alors que l'ancienne policy n'autorisait que {order_number}/…

DROP POLICY IF EXISTS "Users can view their order documents" ON storage.objects;

CREATE POLICY "Users can view their order documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'order-documents'
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.user_id = auth.uid()
    AND (
      storage.objects.name LIKE orders.order_number || '/%'
      OR storage.objects.name LIKE orders.id::text || '/%'
    )
  )
);
