-- Idempotent : arrondir les prix produits à 2 décimales et vider les paniers serveur.
-- Ne touche pas orders / order_items. Exécuter une fois par environnement (staging puis prod).

UPDATE public.products
SET
  price_ht = ROUND(COALESCE(price_ht, 0)::numeric, 2),
  price_ttc = ROUND(COALESCE(price_ttc, 0)::numeric, 2),
  purchase_price_ht = CASE
    WHEN purchase_price_ht IS NULL THEN NULL
    ELSE ROUND(purchase_price_ht::numeric, 2)
  END,
  promo_price_ht = CASE
    WHEN promo_price_ht IS NULL THEN NULL
    ELSE ROUND(promo_price_ht::numeric, 2)
  END
WHERE
  price_ht IS DISTINCT FROM ROUND(COALESCE(price_ht, 0)::numeric, 2)
  OR price_ttc IS DISTINCT FROM ROUND(COALESCE(price_ttc, 0)::numeric, 2)
  OR (
    purchase_price_ht IS NOT NULL
    AND purchase_price_ht IS DISTINCT FROM ROUND(purchase_price_ht::numeric, 2)
  )
  OR (
    promo_price_ht IS NOT NULL
    AND promo_price_ht IS DISTINCT FROM ROUND(promo_price_ht::numeric, 2)
  );

TRUNCATE TABLE public.user_carts;
