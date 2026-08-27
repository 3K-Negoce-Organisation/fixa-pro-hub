-- Ajoute 13eVisuel (comme 4e, bannière hero plus basse)
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
    '12eVisuel',
    '13eVisuel'
  ));

COMMENT ON COLUMN public.sites.home_visual IS
  '1–4 historiques ; 5–10 catalogue aéré ; 11e showcase ; 12e 8 univers en ligne ; 13e comme 4e hero plus bas. Défaut 3eVisuel.';
