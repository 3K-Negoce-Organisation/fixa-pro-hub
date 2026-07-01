-- Diagnostic factures officielles VIS-202606-F4UDEO / VIS-202606-OOVA6L
SELECT
  order_number,
  id,
  status,
  is_archived,
  total_ht,
  total_ttc,
  shipping_name,
  customer_invoice_number,
  customer_invoice_issued_at,
  site_id,
  created_at
FROM public.orders
WHERE order_number IN ('VIS-202606-F4UDEO', 'VIS-202606-OOVA6L')
   OR order_number ILIKE '%F4UDEO%'
   OR order_number ILIKE '%OOVA6L%'
ORDER BY created_at;

SELECT count(*)::int AS total_orders FROM public.orders;

SELECT order_number, status, is_archived, created_at
FROM public.orders
WHERE order_number ILIKE 'VIS-202606-%'
ORDER BY created_at;
