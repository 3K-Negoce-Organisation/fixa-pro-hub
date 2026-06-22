-- Backfill manual_intervention (séparé de l'ADD VALUE enum — même transaction interdite en PG)
UPDATE public.orders o
SET
  status = 'manual_intervention',
  status_before_intervention = o.status::text,
  updated_at = now()
FROM (
  SELECT DISTINCT ON (order_id) order_id
  FROM public.order_status_events
  WHERE event_kind = 'supplier_problem'
  ORDER BY order_id, created_at DESC
) e
WHERE o.id = e.order_id
  AND o.status::text NOT IN ('manual_intervention', 'cancelled');
