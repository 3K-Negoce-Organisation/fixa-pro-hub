SELECT order_number, customer_invoice_number, shipping_name, total_ttc, status::text
FROM public.orders
WHERE customer_invoice_number IS NOT NULL AND btrim(customer_invoice_number) <> ''
ORDER BY customer_invoice_issued_at DESC NULLS LAST;
