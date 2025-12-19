-- Add user_email column to orders table for denormalized access
ALTER TABLE public.orders ADD COLUMN user_email text;

-- Create index for searching by email
CREATE INDEX idx_orders_user_email ON public.orders(user_email);