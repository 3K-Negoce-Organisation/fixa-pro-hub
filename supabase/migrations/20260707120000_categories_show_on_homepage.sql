-- Affichage optionnel des catégories sur la page d'accueil vitrine
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS show_on_homepage boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.categories.show_on_homepage IS
  'Si true et image_url renseignée, la catégorie apparaît sur la page d''accueil. Les produits restent accessibles via /produits.';

UPDATE public.categories
SET show_on_homepage = true
WHERE image_url IS NOT NULL
  AND trim(image_url) <> ''
  AND show_on_homepage = false;
