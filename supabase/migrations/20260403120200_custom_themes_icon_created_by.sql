-- Alignement schéma custom_themes avec bases legacy (admin)
ALTER TABLE public.custom_themes ADD COLUMN IF NOT EXISTS icon_id character varying NOT NULL DEFAULT 'palette'::character varying;
ALTER TABLE public.custom_themes ADD COLUMN IF NOT EXISTS created_by uuid;
