SELECT o.order_number, oi.id::text, oi.product_id, oi.product_title, oi.variant_title,
       oi.quantity, oi.unit_price_ht, oi.unit_price_ttc, oi.product_image
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.order_number IN ('VIS-202606-F4UDEO', 'VIS-202606-OOVA6L')
ORDER BY o.order_number, oi.created_at;
