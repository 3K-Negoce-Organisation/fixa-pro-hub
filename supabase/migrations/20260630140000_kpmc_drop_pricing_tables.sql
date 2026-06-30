-- Pricing KPMC : source de vérité = public.products (catalogue e-commerce).
-- Tables intermédiaires kpmc.pricing_* supprimées (page React KPMC branchée sur public).

DROP TABLE IF EXISTS kpmc.pricing_products;
DROP TABLE IF EXISTS kpmc.pricing_margin_rule;
