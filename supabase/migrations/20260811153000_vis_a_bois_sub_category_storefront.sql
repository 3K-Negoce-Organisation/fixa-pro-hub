-- Buckets marketing Vis-à-Bois (Tirefond, Vis de charpente, …) → sub_category
-- pour conserver le même visuel vitrine tout en abandonnant la table categories.

DO $$
DECLARE
  v_site_id uuid;
  v_gamme_id uuid;
  v_cp_id uuid;
BEGIN
  SELECT id INTO v_site_id FROM public.sites WHERE slug = 'vis-a-bois' LIMIT 1;
  SELECT id INTO v_gamme_id FROM public.gammes WHERE slug = 'vissage' LIMIT 1;

  IF v_site_id IS NULL OR v_gamme_id IS NULL THEN
    RAISE NOTICE 'sites.vis-a-bois ou gammes.vissage introuvable — skip';
    RETURN;
  END IF;

  -- Assurer sites.gamme_id = vissage
  UPDATE public.sites
  SET gamme_id = v_gamme_id
  WHERE id = v_site_id
    AND (gamme_id IS NULL OR gamme_id IS DISTINCT FROM v_gamme_id);

  -- category_product d’ancrage sous vissage (préfère vis-visserie)
  SELECT id INTO v_cp_id
  FROM public.category_product
  WHERE gamme_id = v_gamme_id
    AND slug = 'vis-visserie'
  LIMIT 1;

  IF v_cp_id IS NULL THEN
    SELECT id INTO v_cp_id
    FROM public.category_product
    WHERE gamme_id = v_gamme_id
      AND is_active IS DISTINCT FROM false
    ORDER BY sort_order NULLS LAST, name
    LIMIT 1;
  END IF;

  IF v_cp_id IS NULL THEN
    RAISE NOTICE 'Aucun category_product pour vissage — skip';
    RETURN;
  END IF;

  -- Upsert des catégories marketing site → sub_category (scopées site_id)
  INSERT INTO public.sub_category (
    site_id,
    name,
    slug,
    description,
    image_url,
    sort_order,
    is_active,
    show_on_homepage,
    category_product_id
  )
  SELECT
    c.site_id,
    c.name,
    c.slug,
    c.description,
    c.image_url,
    c.sort_order,
    COALESCE(c.is_active, true),
    COALESCE(c.show_on_homepage, false),
    v_cp_id
  FROM public.categories c
  WHERE c.site_id = v_site_id
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

  -- Rattacher les produits Vis-à-Bois à la sub_category marketing (même slug)
  UPDATE public.products p
  SET sub_category_id = sc.id
  FROM public.categories c
  JOIN public.sub_category sc
    ON sc.slug = c.slug
   AND sc.site_id = c.site_id
   AND sc.category_product_id = v_cp_id
  WHERE p.category_id = c.id
    AND p.site_id = v_site_id;
END $$;
