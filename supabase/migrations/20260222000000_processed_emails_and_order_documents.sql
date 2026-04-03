-- processed_emails table + order-documents bucket and policies
CREATE TABLE IF NOT EXISTS public.processed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT UNIQUE NOT NULL,
  mail_type VARCHAR NOT NULL,
  order_number VARCHAR,
  source VARCHAR DEFAULT 'n8n',
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE processed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role only for processed_emails" ON processed_emails;
CREATE POLICY "Service role only for processed_emails"
  ON processed_emails FOR ALL USING (false);
INSERT INTO storage.buckets (id, name, public)
  VALUES ('order-documents', 'order-documents', true)
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Public read order-documents" ON storage.objects;
CREATE POLICY "Public read order-documents"
  ON storage.objects FOR SELECT USING (bucket_id = 'order-documents');
DROP POLICY IF EXISTS "Service role upload order-documents" ON storage.objects;
CREATE POLICY "Service role upload order-documents"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'order-documents');
