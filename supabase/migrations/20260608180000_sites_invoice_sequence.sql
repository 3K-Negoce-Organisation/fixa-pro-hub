-- Séquence interne des factures fournisseur (FACTURE) par site : FACTURE_{order_number}_001.pdf

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS invoice_sequence integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sites.invoice_sequence IS
  'Dernier numéro de séquence attribué aux factures fournisseur (FACTURE) du site.';

CREATE OR REPLACE FUNCTION public.next_site_invoice_sequence(p_site_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seq integer;
BEGIN
  UPDATE public.sites
  SET invoice_sequence = invoice_sequence + 1
  WHERE id = p_site_id
  RETURNING invoice_sequence INTO v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Site % not found', p_site_id;
  END IF;

  RETURN v_seq;
END;
$$;

REVOKE ALL ON FUNCTION public.next_site_invoice_sequence(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_site_invoice_sequence(uuid) TO service_role;
