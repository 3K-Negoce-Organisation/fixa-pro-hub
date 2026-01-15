-- Ajouter les colonnes first_name et last_name à la table profiles
ALTER TABLE public.profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Migrer les données existantes de company_name vers last_name (car utilisé comme "nom complet")
UPDATE public.profiles 
SET last_name = company_name 
WHERE company_name IS NOT NULL AND company_name != '';