-- Recherche exhaustive VIS-202606-F4UDEO / VIS-202606-OOVA6L

SELECT 'orders.exact' AS src, order_number, id::text, status::text, total_ttc::text, customer_invoice_number, created_at::text
FROM public.orders
WHERE order_number IN ('VIS-202606-F4UDEO', 'VIS-202606-OOVA6L');

SELECT 'orders.like' AS src, order_number, id::text, status::text, total_ttc::text, customer_invoice_number, created_at::text
FROM public.orders
WHERE order_number ILIKE '%F4UDEO%' OR order_number ILIKE '%OOVA6L%'
   OR coalesce(customer_invoice_number,'') ILIKE '%F4UDEO%'
   OR coalesce(customer_invoice_number,'') ILIKE '%OOVA6L%'
   OR coalesce(notes,'') ILIKE '%F4UDEO%'
   OR coalesce(notes,'') ILIKE '%OOVA6L%';

SELECT 'order_items' AS src, o.order_number, oi.product_title, oi.quantity::text, oi.unit_price_ttc::text
FROM public.order_items oi
JOIN public.orders o ON o.id = oi.order_id
WHERE o.order_number ILIKE '%F4UDEO%' OR o.order_number ILIKE '%OOVA6L%';

SELECT 'kpmc.factures_clients' AS src, numero_facture, commande_ref, client_nom, total_ttc::text, statut
FROM kpmc.factures_clients
WHERE numero_facture ILIKE '%F4UDEO%' OR numero_facture ILIKE '%OOVA6L%'
   OR coalesce(commande_ref,'') ILIKE '%F4UDEO%' OR coalesce(commande_ref,'') ILIKE '%OOVA6L%';

SELECT 'orders.all_vis_202606' AS src, order_number, status::text, total_ttc::text, customer_invoice_number, created_at::text
FROM public.orders
WHERE order_number ILIKE 'VIS-202606-%'
ORDER BY created_at;

SELECT count(*)::int AS orders_total FROM public.orders;
