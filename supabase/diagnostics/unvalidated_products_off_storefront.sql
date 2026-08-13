-- One-shot staging : retirer les produits non validés des vitrines (Vis-à-Bois).
-- Source : admin-hub-central supabase/migrations/20260813182000_unvalidated_products_off_storefront.sql

UPDATE public.products
SET
  site_id = NULL,
  is_active = false
WHERE validated = 'no'
  AND (site_id IS NOT NULL OR is_active IS DISTINCT FROM false);

CREATE OR REPLACE FUNCTION public.enforce_unvalidated_off_storefront()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.validated = 'no' THEN
    NEW.site_id := NULL;
    NEW.is_active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_unvalidated_off_storefront ON public.products;
CREATE TRIGGER trg_products_unvalidated_off_storefront
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_unvalidated_off_storefront();

SELECT
  COUNT(*) FILTER (WHERE validated = 'no' AND site_id IS NOT NULL) AS non_valides_encore_lies,
  COUNT(*) FILTER (WHERE validated = 'no' AND is_active IS DISTINCT FROM false) AS non_valides_encore_actifs,
  COUNT(*) FILTER (WHERE validated = 'no') AS non_valides_total,
  COUNT(*) FILTER (WHERE validated = 'yes' AND is_active = true) AS valides_actifs
FROM public.products;
