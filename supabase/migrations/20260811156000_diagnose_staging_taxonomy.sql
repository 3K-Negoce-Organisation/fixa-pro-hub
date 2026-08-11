SELECT 'categories' AS src, count(*)::int AS n
FROM public.categories c
JOIN public.sites s ON s.id = c.site_id
WHERE s.slug = 'vis-a-bois'
UNION ALL
SELECT 'sub_category_site', count(*)::int
FROM public.sub_category sc
JOIN public.sites s ON s.id = sc.site_id
WHERE s.slug = 'vis-a-bois'
UNION ALL
SELECT 'sub_category_all', count(*)::int FROM public.sub_category
UNION ALL
SELECT 'category_product', count(*)::int FROM public.category_product
UNION ALL
SELECT 'gammes', count(*)::int FROM public.gammes;

SELECT name, slug FROM public.gammes ORDER BY sort_order NULLS LAST LIMIT 20;
SELECT name, slug FROM public.category_product WHERE gamme_id = (SELECT id FROM gammes WHERE slug='vissage') LIMIT 20;
SELECT name, slug, site_id IS NOT NULL AS scoped FROM public.categories c WHERE site_id = (SELECT id FROM sites WHERE slug='vis-a-bois') LIMIT 20;
