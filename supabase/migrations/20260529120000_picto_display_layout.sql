-- Réglages d'affichage des pictos caractéristiques (admin → fiche produit)

ALTER TABLE public.product_characteristic_icons
  ADD COLUMN IF NOT EXISTS picto_height_px integer NOT NULL DEFAULT 36,
  ADD COLUMN IF NOT EXISTS picto_width_px integer,
  ADD COLUMN IF NOT EXISTS text_placement text NOT NULL DEFAULT 'outside',
  ADD COLUMN IF NOT EXISTS text_offset_x integer NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS text_offset_y integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS text_font_size_px integer NOT NULL DEFAULT 14;

ALTER TABLE public.product_characteristic_icons
  DROP CONSTRAINT IF EXISTS product_characteristic_icons_text_placement_check;

ALTER TABLE public.product_characteristic_icons
  ADD CONSTRAINT product_characteristic_icons_text_placement_check
  CHECK (text_placement IN ('inside', 'outside'));

ALTER TABLE public.product_characteristic_icons
  DROP CONSTRAINT IF EXISTS product_characteristic_icons_picto_height_positive;

ALTER TABLE public.product_characteristic_icons
  ADD CONSTRAINT product_characteristic_icons_picto_height_positive
  CHECK (picto_height_px > 0);

ALTER TABLE public.product_characteristic_icons
  DROP CONSTRAINT IF EXISTS product_characteristic_icons_text_font_size_positive;

ALTER TABLE public.product_characteristic_icons
  ADD CONSTRAINT product_characteristic_icons_text_font_size_positive
  CHECK (text_font_size_px > 0);

COMMENT ON COLUMN public.product_characteristic_icons.picto_height_px IS
  'Hauteur d''affichage du picto sur la fiche produit (px).';
COMMENT ON COLUMN public.product_characteristic_icons.picto_width_px IS
  'Largeur fixe du picto (px). NULL = proportionnelle à la hauteur.';
COMMENT ON COLUMN public.product_characteristic_icons.text_placement IS
  'inside = texte superposé sur l''image ; outside = texte à côté.';
COMMENT ON COLUMN public.product_characteristic_icons.text_offset_x IS
  'Décalage horizontal du texte (px).';
COMMENT ON COLUMN public.product_characteristic_icons.text_offset_y IS
  'Décalage vertical du texte (px).';
