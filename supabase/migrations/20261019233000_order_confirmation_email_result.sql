-- Résultat de l’e-mail de confirmation client (Resend).
-- N’envoie aucun mail et ne relance aucun bon de commande.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS confirmation_email_status text,
  ADD COLUMN IF NOT EXISTS confirmation_email_id text,
  ADD COLUMN IF NOT EXISTS confirmation_email_error text,
  ADD COLUMN IF NOT EXISTS confirmation_email_pdf_error text,
  ADD COLUMN IF NOT EXISTS confirmation_email_at timestamptz;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_confirmation_email_status_check;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_confirmation_email_status_check
  CHECK (
    confirmation_email_status IS NULL
    OR confirmation_email_status IN ('sending', 'accepted', 'failed')
  );

COMMENT ON COLUMN public.orders.confirmation_email_status IS
  'sending = envoi en cours, accepted = Resend a accepté, failed = refus ou erreur (rejeu possible).';
COMMENT ON COLUMN public.orders.confirmation_email_id IS
  'Identifiant Resend si accepted, jeton de verrou si sending.';
COMMENT ON COLUMN public.orders.confirmation_email_error IS
  'Raison du refus ou de l’échec, sans adresse e-mail client.';
COMMENT ON COLUMN public.orders.confirmation_email_pdf_error IS
  'Erreur de génération du PDF fournisseur. N’empêche pas l’e-mail client.';
