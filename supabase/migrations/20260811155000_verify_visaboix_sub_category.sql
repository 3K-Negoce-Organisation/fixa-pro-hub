SELECT sc.name, sc.slug, sc.show_on_homepage,
       (sc.image_url IS NOT NULL) AS has_img
FROM public.sub_category sc
JOIN public.sites s ON s.id = sc.site_id
WHERE s.slug = 'vis-a-bois'
ORDER BY sc.sort_order;

SELECT s.slug, s.gamme_id IS NOT NULL AS has_gamme, g.slug AS gamme
FROM public.sites s
LEFT JOIN public.gammes g ON g.id = s.gamme_id
WHERE s.slug = 'vis-a-bois';
