SELECT order_number, id::text, user_id::text, status::text, total_ht, total_ttc,
       shipping_name, shipping_address, shipping_city, shipping_postal_code, shipping_country,
       user_email, customer_invoice_number, customer_invoice_issued_at::text,
       site_id::text, is_archived, created_at::text, updated_at::text
FROM public.orders
WHERE order_number IN ('VIS-202606-F4UDEO', 'VIS-202606-OOVA6L');
