SELECT order_number, status::text, total_ttc, customer_invoice_number, shipping_name, created_at::date
FROM public.orders
ORDER BY created_at DESC;
