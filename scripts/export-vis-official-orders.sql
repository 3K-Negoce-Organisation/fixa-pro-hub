SELECT o.order_number, oi.product_title, oi.variant_title, oi.quantity, oi.unit_price_ht, oi.unit_price_ttc
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.order_number IN ('VIS-202606-F4UDEO', 'VIS-202606-OOVA6L')
ORDER BY o.order_number, oi.created_at;

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'orders'
ORDER BY ordinal_position;
