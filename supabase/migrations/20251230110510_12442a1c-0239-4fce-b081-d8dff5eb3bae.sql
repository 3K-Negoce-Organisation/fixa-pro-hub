-- Add marketing consent columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS marketing_consent_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS newsletter_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS newsletter_consent_date timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.marketing_consent IS 'GDPR: User consent for marketing communications';
COMMENT ON COLUMN public.profiles.newsletter_consent IS 'GDPR: User consent for newsletter subscription';