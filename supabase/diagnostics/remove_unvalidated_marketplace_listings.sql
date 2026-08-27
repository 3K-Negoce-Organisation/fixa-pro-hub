-- One-shot staging : retirer les listings marketplace des produits non validés.
-- Source canonique : admin-hub-central supabase/migrations/20260813180000_unvalidated_products_no_marketplace.sql

DO $$
DECLARE
  listing_count integer;
  product_count integer;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT cl.product_id)
  INTO listing_count, product_count
  FROM public.channel_listings cl
  JOIN public.products p ON p.id = cl.product_id
  WHERE p.validated = 'no';

  RAISE NOTICE 'Listings marketplace à retirer: % sur % produit(s) non validé(s)',
    listing_count, product_count;
END $$;

DELETE FROM public.channel_listings cl
USING public.products p
WHERE cl.product_id = p.id
  AND p.validated = 'no';

CREATE OR REPLACE FUNCTION public.enforce_validated_marketplace_listing()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v text;
BEGIN
  SELECT p.validated INTO v
  FROM public.products p
  WHERE p.id = NEW.product_id;

  IF v = 'no' THEN
    RAISE EXCEPTION 'Un produit non validé ne peut pas être assigné à une marketplace'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_channel_listings_require_validated ON public.channel_listings;
CREATE TRIGGER trg_channel_listings_require_validated
  BEFORE INSERT OR UPDATE OF product_id ON public.channel_listings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_validated_marketplace_listing();

CREATE OR REPLACE FUNCTION public.remove_listings_when_unvalidated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.validated = 'no' AND OLD.validated IS DISTINCT FROM 'no' THEN
    DELETE FROM public.channel_listings WHERE product_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_products_unvalidated_remove_listings ON public.products;
CREATE TRIGGER trg_products_unvalidated_remove_listings
  AFTER UPDATE OF validated ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_listings_when_unvalidated();

SELECT
  (SELECT COUNT(*) FROM public.channel_listings cl
    JOIN public.products p ON p.id = cl.product_id
    WHERE p.validated = 'no') AS listings_non_valides_restants,
  (SELECT COUNT(*) FROM public.channel_listings) AS listings_total;
