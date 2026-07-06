-- Statut « intervention manuelle » + verrouillage admin
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'manual_intervention';

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS status_before_intervention text,
  ADD COLUMN IF NOT EXISTS intervention_assigned_to uuid,
  ADD COLUMN IF NOT EXISTS intervention_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS intervention_assigned_email text;

ALTER TABLE public.order_status_events
  DROP CONSTRAINT IF EXISTS order_status_events_event_kind_check;

ALTER TABLE public.order_status_events
  ADD CONSTRAINT order_status_events_event_kind_check
  CHECK (
    event_kind IN (
      'auto_n8n',
      'auto_stripe',
      'manual_status',
      'manual_document',
      'manual_cmd',
      'refund',
      'payment_link_sent',
      'payment_received',
      'supplier_problem',
      'intervention_claimed'
    )
  );

-- Backfill : voir 20260612120100 (enum non utilisable dans la même transaction).
