-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Anyone can view orders by order_number" ON public.orders;

-- Créer une politique plus sécurisée : utilisateurs voient leurs propres commandes, admins voient tout
CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
TO authenticated
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin')
);