-- Alignement avec les bases legacy (données existantes / admin)
ALTER TABLE public.sites ADD COLUMN IF NOT EXISTS description text;
