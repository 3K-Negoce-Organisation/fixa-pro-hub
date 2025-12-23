-- Allow guest orders by modifying the RLS policy for orders
-- First drop the existing insert policy
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;

-- Create new policy that allows anyone to insert orders
-- The user_id can be any UUID (including guest-generated UUIDs)
CREATE POLICY "Anyone can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Update order_items policy to allow inserts for any order
DROP POLICY IF EXISTS "Users can insert their own order items" ON public.order_items;

CREATE POLICY "Anyone can insert order items" 
ON public.order_items 
FOR INSERT 
WITH CHECK (true);