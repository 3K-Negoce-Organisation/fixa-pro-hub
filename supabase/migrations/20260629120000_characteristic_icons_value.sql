-- Pictos par valeur (usage, matière) : une ligne par (site, clé, valeur normalisée).
ALTER TABLE public.product_characteristic_icons
  ADD COLUMN IF NOT EXISTS characteristic_value text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.product_characteristic_icons.characteristic_value IS
  'Valeur produit normalisée (ex. extérieur, inox a4). Vide = picto générique pour la clé.';

ALTER TABLE public.product_characteristic_icons
  DROP CONSTRAINT IF EXISTS product_characteristic_icons_site_id_characteristic_key_key;

DROP INDEX IF EXISTS public.product_characteristic_icons_site_key_value_uidx;

CREATE UNIQUE INDEX product_characteristic_icons_site_key_value_uidx
  ON public.product_characteristic_icons (
    COALESCE(site_id, '00000000-0000-0000-0000-000000000000'::uuid),
    characteristic_key,
    characteristic_value
  );
