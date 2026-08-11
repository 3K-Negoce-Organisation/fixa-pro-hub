-- Staging: forcer les buckets marketing Vis-à-Bois en sub_category (idempotent + logs)

DO $$
DECLARE
  v_site_id uuid;
  v_gamme_id uuid;
  v_cp_id uuid;
  v_inserted int := 0;
  v_updated int := 0;
  v_products int := 0;
  r record;
BEGIN
  SELECT id INTO v_site_id FROM public.sites WHERE slug = 'vis-a-bois' LIMIT 1;
  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'site vis-a-bois introuvable';
  END IF;

  SELECT id INTO v_gamme_id FROM public.gammes WHERE slug = 'vissage' LIMIT 1;
  IF v_gamme_id IS NULL THEN
    INSERT INTO public.gammes (name, slug, sort_order, is_active, storefront_status)
    VALUES ('Vissage', 'vissage', 0, true, 'active')
    RETURNING id INTO v_gamme_id;
    RAISE NOTICE 'gamme vissage créée: %', v_gamme_id;
  END IF;

  UPDATE public.sites SET gamme_id = v_gamme_id WHERE id = v_site_id;

  SELECT id INTO v_cp_id
  FROM public.category_product
  WHERE gamme_id = v_gamme_id AND slug = 'vis-visserie'
  LIMIT 1;

  IF v_cp_id IS NULL THEN
    SELECT id INTO v_cp_id
    FROM public.category_product
    WHERE gamme_id = v_gamme_id
    ORDER BY sort_order NULLS LAST, name
    LIMIT 1;
  END IF;

  IF v_cp_id IS NULL THEN
    INSERT INTO public.category_product (name, slug, gamme_id, sort_order, is_active, show_on_homepage)
    VALUES ('Vis / visserie', 'vis-visserie', v_gamme_id, 0, true, false)
    RETURNING id INTO v_cp_id;
    RAISE NOTICE 'category_product vis-visserie créé: %', v_cp_id;
  END IF;

  RAISE NOTICE 'site=% gamme=% cp=%', v_site_id, v_gamme_id, v_cp_id;

  FOR r IN
    SELECT c.*
    FROM public.categories c
    WHERE c.site_id = v_site_id
  LOOP
    INSERT INTO public.sub_category (
      site_id, name, slug, description, image_url, sort_order, is_active, show_on_homepage, category_product_id
    ) VALUES (
      v_site_id, r.name, r.slug, r.description, r.image_url, r.sort_order,
      COALESCE(r.is_active, true), COALESCE(r.show_on_homepage, false), v_cp_id
    )
    ON CONFLICT (category_product_id, slug)
    DO UPDATE SET
      site_id = EXCLUDED.site_id,
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      image_url = COALESCE(EXCLUDED.image_url, public.sub_category.image_url),
      sort_order = EXCLUDED.sort_order,
      is_active = EXCLUDED.is_active,
      show_on_homepage = EXCLUDED.show_on_homepage,
      updated_at = now();

    IF FOUND THEN
      v_updated := v_updated + 1;
    END IF;
    v_inserted := v_inserted + 1;
  END LOOP;

  UPDATE public.products p
  SET sub_category_id = sc.id
  FROM public.categories c
  JOIN public.sub_category sc
    ON sc.slug = c.slug
   AND sc.site_id = c.site_id
   AND sc.category_product_id = v_cp_id
  WHERE p.category_id = c.id
    AND p.site_id = v_site_id;

  GET DIAGNOSTICS v_products = ROW_COUNT;

  RAISE NOTICE 'categories traitées=% produits relinkés=%', v_inserted, v_products;
END $$;

SELECT sc.name, sc.slug, sc.show_on_homepage, (sc.image_url IS NOT NULL) AS has_img
FROM public.sub_category sc
JOIN public.sites s ON s.id = sc.site_id
WHERE s.slug = 'vis-a-bois'
ORDER BY sc.sort_order NULLS LAST, sc.name;
