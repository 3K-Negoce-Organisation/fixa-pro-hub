-- Hub marketplace : inventaire, listings canaux, commandes externes, jobs sync

-- Stock calculé hub (source pour push marketplaces)
CREATE TABLE IF NOT EXISTS public.inventory_available (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_physical INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER GENERATED ALWAYS AS (
    GREATEST(0, quantity_physical - quantity_reserved - safety_buffer)
  ) STORED,
  safety_buffer INTEGER NOT NULL DEFAULT 0,
  last_alsafix_sync_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.inventory_available IS
  'Stock disponible hub = physique − réservé − buffer ; poussé vers marketplaces.';

-- Réservations (paniers, commandes en attente)
CREATE TABLE IF NOT EXISTS public.inventory_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  source TEXT NOT NULL CHECK (source IN ('cart', 'order', 'marketplace_pending')),
  source_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS inventory_reservations_product_id_idx
  ON public.inventory_reservations (product_id);

CREATE INDEX IF NOT EXISTS inventory_reservations_source_idx
  ON public.inventory_reservations (source, source_id);

-- Référencement par canal
CREATE TABLE IF NOT EXISTS public.channel_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  seller_sku TEXT NOT NULL,
  external_offer_id TEXT,
  external_product_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'error', 'disabled')),
  last_stock_push_at TIMESTAMPTZ,
  last_price_push_at TIMESTAMPTZ,
  last_error TEXT,
  channel_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, seller_sku)
);

CREATE INDEX IF NOT EXISTS channel_listings_product_id_idx
  ON public.channel_listings (product_id);

CREATE INDEX IF NOT EXISTS channel_listings_channel_status_idx
  ON public.channel_listings (channel, status);

-- Lien commande marketplace ↔ commande interne
CREATE TABLE IF NOT EXISTS public.channel_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  external_order_id TEXT NOT NULL,
  external_status TEXT,
  raw_payload JSONB,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (channel, external_order_id)
);

CREATE INDEX IF NOT EXISTS channel_orders_order_id_idx
  ON public.channel_orders (order_id);

-- Journal synchronisations
CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL CHECK (job_type IN (
    'fabdis_import', 'stock_push', 'order_pull', 'catalog_push', 'price_push', 'reconcile'
  )),
  channel TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  items_total INTEGER NOT NULL DEFAULT 0,
  items_success INTEGER NOT NULL DEFAULT 0,
  items_failed INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sync_jobs_channel_status_idx
  ON public.sync_jobs (channel, status, created_at DESC);

-- Règles prix par canal (phase 4)
CREATE TABLE IF NOT EXISTS public.channel_pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL UNIQUE,
  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  markup_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  round_to_cents BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Imports FAB-DIS catalogue (stub phase ultérieure)
CREATE TABLE IF NOT EXISTS public.fabdis_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_filename TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_upserted INTEGER NOT NULL DEFAULT 0,
  error_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Sync products.stock → inventory_available
CREATE OR REPLACE FUNCTION public.sync_inventory_available_from_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_available (
    product_id,
    quantity_physical,
    last_alsafix_sync_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.stock, 0),
    now(),
    now()
  )
  ON CONFLICT (product_id) DO UPDATE SET
    quantity_physical = COALESCE(NEW.stock, 0),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_stock_sync_inventory ON public.products;
CREATE TRIGGER products_stock_sync_inventory
  AFTER INSERT OR UPDATE OF stock ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_inventory_available_from_product();

-- Backfill inventaire depuis products existants
INSERT INTO public.inventory_available (product_id, quantity_physical, last_alsafix_sync_at, updated_at)
SELECT id, COALESCE(stock, 0), now(), now()
FROM public.products
ON CONFLICT (product_id) DO UPDATE SET
  quantity_physical = EXCLUDED.quantity_physical,
  updated_at = now();

-- RLS admin
ALTER TABLE public.inventory_available ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fabdis_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage inventory_available"
  ON public.inventory_available FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage inventory_reservations"
  ON public.inventory_reservations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage channel_listings"
  ON public.channel_listings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage channel_orders"
  ON public.channel_orders FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage sync_jobs"
  ON public.sync_jobs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage channel_pricing_rules"
  ON public.channel_pricing_rules FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage fabdis_imports"
  ON public.fabdis_imports FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));
