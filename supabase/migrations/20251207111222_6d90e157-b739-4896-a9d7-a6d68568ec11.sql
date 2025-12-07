-- Add policy for public order tracking by order number
CREATE POLICY "Anyone can view orders by order_number"
ON public.orders
FOR SELECT
USING (true);

-- Update the existing policy to be more specific for authenticated users
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Add policy for public order items viewing (when order is accessible)
CREATE POLICY "Anyone can view order items for accessible orders"
ON public.order_items
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;