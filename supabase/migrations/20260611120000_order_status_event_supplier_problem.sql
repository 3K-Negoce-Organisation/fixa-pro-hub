-- Alertes problème fournisseur (mail Alsafix → pierre@luceka.com)
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
      'supplier_problem'
    )
  );
