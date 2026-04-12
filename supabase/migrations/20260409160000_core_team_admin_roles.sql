-- Idempotent: grant admin role to core team (match auth.users by email).
-- Sur staging/develop vides (0 compte auth), l'INSERT ne fait rien jusqu'à inscription ;
-- à ré-appliquer après `supabase db push` ou ré-exécuter ce SQL une fois les comptes créés.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(trim(u.email)) = ANY (
  ARRAY[
    'pierre.kabore@gmail.com',
    'christophe.kabore@gmail.com',
    'kaborematthieu@gmail.com'
  ]
)
ON CONFLICT (user_id, role) DO NOTHING;
