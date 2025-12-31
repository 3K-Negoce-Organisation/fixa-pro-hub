-- Create user_carts table for persistent cart storage
CREATE TABLE public.user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

-- Users can only view their own cart
CREATE POLICY "Users can view their own cart"
ON public.user_carts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own cart
CREATE POLICY "Users can insert their own cart"
ON public.user_carts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update their own cart"
ON public.user_carts
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own cart
CREATE POLICY "Users can delete their own cart"
ON public.user_carts
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger to update updated_at on changes
CREATE TRIGGER update_user_carts_updated_at
BEFORE UPDATE ON public.user_carts
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();