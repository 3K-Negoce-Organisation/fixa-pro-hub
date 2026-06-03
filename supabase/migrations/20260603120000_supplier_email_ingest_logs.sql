-- Supplier email ingest pipeline logs (admin workflow visibility)
CREATE TABLE IF NOT EXISTS public.supplier_email_ingest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_number TEXT,
  order_number_alsafix TEXT,
  mail_type TEXT,
  pipeline_status TEXT NOT NULL DEFAULT 'running'
    CHECK (pipeline_status IN ('running', 'success', 'failed', 'skipped')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  edge_function_request JSONB,
  edge_function_response JSONB,
  error_message TEXT,
  source TEXT NOT NULL DEFAULT 'edge',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_supplier_email_ingest_logs_order_number
  ON public.supplier_email_ingest_logs (order_number, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_supplier_email_ingest_logs_gmail_message_id
  ON public.supplier_email_ingest_logs (gmail_message_id);

CREATE INDEX IF NOT EXISTS idx_supplier_email_ingest_logs_started_at
  ON public.supplier_email_ingest_logs (started_at DESC);

ALTER TABLE public.supplier_email_ingest_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read supplier email ingest logs" ON public.supplier_email_ingest_logs;
CREATE POLICY "Admins read supplier email ingest logs"
  ON public.supplier_email_ingest_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.processed_emails
  ADD COLUMN IF NOT EXISTS order_number_alsafix TEXT;
