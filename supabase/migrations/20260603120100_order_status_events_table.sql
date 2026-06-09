ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;

CREATE TABLE IF NOT EXISTS public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status public.order_status NOT NULL,
  event_kind text NOT NULL CHECK (
    event_kind IN (
      'auto_n8n',
      'auto_stripe',
      'manual_status',
      'manual_document',
      'manual_cmd',
      'refund',
      'payment_link_sent',
      'payment_received'
    )
  ),
  is_manual boolean NOT NULL DEFAULT false,
  note text,
  document jsonb,
  amount_ttc numeric(12, 2),
  stripe_checkout_session_id text,
  stripe_refund_id text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_events_order_id_created_at
  ON public.order_status_events (order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_order_status_events_checkout_session
  ON public.order_status_events (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

ALTER TABLE public.order_status_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read order status events" ON public.order_status_events;
CREATE POLICY "Admins can read order status events"
  ON public.order_status_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

UPDATE public.orders
SET stripe_payment_intent_id = (regexp_match(notes, '(pi_[a-zA-Z0-9]+)'))[1]
WHERE stripe_payment_intent_id IS NULL
  AND notes ~ 'pi_[a-zA-Z0-9]+';

UPDATE public.orders
SET stripe_checkout_session_id = (regexp_match(notes, '(cs_[a-zA-Z0-9]+)'))[1]
WHERE stripe_checkout_session_id IS NULL
  AND notes ~ 'cs_[a-zA-Z0-9]+';

INSERT INTO public.order_status_events (order_id, status, event_kind, is_manual, note)
SELECT o.id,
  o.status,
  CASE
    WHEN o.status::text IN ('paid', 'awaiting_payment') THEN 'auto_stripe'
    ELSE 'auto_n8n'
  END,
  false,
  'Événement initial (migration)'
FROM public.orders o
WHERE o.status::text NOT IN ('pending')
  AND NOT EXISTS (
    SELECT 1 FROM public.order_status_events e WHERE e.order_id = o.id
  );
