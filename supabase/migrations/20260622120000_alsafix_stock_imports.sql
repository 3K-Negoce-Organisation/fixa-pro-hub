-- Import stock Alsafix (fichier Excel reçu par email / n8n)

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS ean TEXT;

CREATE INDEX IF NOT EXISTS products_ean_idx ON public.products (ean)
  WHERE ean IS NOT NULL;

COMMENT ON COLUMN public.products.ean IS
  'EAN/GTIN fabricant (ex. colonne EAN13 export stock Alsafix).';

CREATE TABLE IF NOT EXISTS public.alsafix_stock_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id TEXT,
  source_filename TEXT,
  source TEXT NOT NULL DEFAULT 'email_n8n',
  status TEXT NOT NULL DEFAULT 'running',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_updated INTEGER NOT NULL DEFAULT 0,
  rows_skipped INTEGER NOT NULL DEFAULT 0,
  rows_unknown_code INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS alsafix_stock_imports_message_id_uidx
  ON public.alsafix_stock_imports (message_id)
  WHERE message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.alsafix_stock_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id UUID NOT NULL REFERENCES public.alsafix_stock_imports(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  code_alsafix TEXT NOT NULL,
  stock_reel INTEGER NOT NULL DEFAULT 0,
  stock_agents INTEGER,
  stock_achat INTEGER,
  stock_applied INTEGER NOT NULL DEFAULT 0,
  etat TEXT,
  ean TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS alsafix_stock_snapshots_import_id_idx
  ON public.alsafix_stock_snapshots (import_id);

CREATE INDEX IF NOT EXISTS alsafix_stock_snapshots_code_idx
  ON public.alsafix_stock_snapshots (code_alsafix);

ALTER TABLE public.alsafix_stock_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alsafix_stock_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage alsafix stock imports"
  ON public.alsafix_stock_imports
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage alsafix stock snapshots"
  ON public.alsafix_stock_snapshots
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
