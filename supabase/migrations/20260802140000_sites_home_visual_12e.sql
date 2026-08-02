-- Ajoute 12eVisuel (comme 6e, 8 univers sur une seule ligne)
ALTER TABLE public.sites DROP CONSTRAINT IF EXISTS sites_home_visual_check;

ALTER TABLE public.sites
  ADD CONSTRAINT sites_home_visual_check
  CHECK (home_visual IN (
    '1erVisuel',
    '2eVisuel',
    '3eVisuel',
    '4eVisuel',
    '5eVisuel',
    '6eVisuel',
    '7eVisuel',
    '8eVisuel',
    '9eVisuel',
    '10eVisuel',
    '11eVisuel',
    '12eVisuel'
  ));

COMMENT ON COLUMN public.sites.home_visual IS
  '1–4 historiques ; 5–10 catalogue aéré ; 11e showcase ; 12e comme 6e avec 8 univers en ligne. Défaut 3eVisuel.';
