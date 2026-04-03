-- Colonnes présentes en base legacy mais parfois absentes si la table existait avant évolution des migrations.
ALTER TABLE public.custom_themes ADD COLUMN IF NOT EXISTS description text;
