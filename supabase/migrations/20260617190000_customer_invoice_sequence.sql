-- Numéro et date de facture client (séquence dédiée, distincte des factures fournisseur)

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS customer_invoice_sequence integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sites.customer_invoice_sequence IS
  'Dernier numéro de séquence attribué aux factures client (FACTURE_CLIENT) du site.';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_invoice_number text,
  ADD COLUMN IF NOT EXISTS customer_invoice_issued_at timestamptz;

COMMENT ON COLUMN public.orders.customer_invoice_number IS
  'Numéro séquentiel de facture client (ex. FC-2026-00001).';
COMMENT ON COLUMN public.orders.customer_invoice_issued_at IS
  'Date d''émission de la facture client (réception facture fournisseur / livraison).';

CREATE OR REPLACE FUNCTION public.next_site_customer_invoice_sequence(p_site_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  UPDATE public.sites
  SET customer_invoice_sequence = customer_invoice_sequence + 1
  WHERE id = p_site_id
  RETURNING customer_invoice_sequence INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Site % not found', p_site_id;
  END IF;

  RETURN v_seq;
END;
$$;

REVOKE ALL ON FUNCTION public.next_site_customer_invoice_sequence(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_site_customer_invoice_sequence(uuid) TO service_role;
