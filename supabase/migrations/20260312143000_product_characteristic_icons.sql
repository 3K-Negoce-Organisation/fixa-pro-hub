CREATE TABLE IF NOT EXISTS public.product_characteristic_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  characteristic_key text NOT NULL,
  label text NOT NULL,
  icon_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(site_id, characteristic_key)
);

CREATE INDEX IF NOT EXISTS idx_product_characteristic_icons_site_id
  ON public.product_characteristic_icons(site_id);

DROP TRIGGER IF EXISTS update_product_characteristic_icons_updated_at
  ON public.product_characteristic_icons;
CREATE TRIGGER update_product_characteristic_icons_updated_at
  BEFORE UPDATE ON public.product_characteristic_icons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_characteristic_icons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read product characteristic icons"
  ON public.product_characteristic_icons;
CREATE POLICY "Anyone can read product characteristic icons"
  ON public.product_characteristic_icons
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert product characteristic icons"
  ON public.product_characteristic_icons;
CREATE POLICY "Admins can insert product characteristic icons"
  ON public.product_characteristic_icons
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update product characteristic icons"
  ON public.product_characteristic_icons;
CREATE POLICY "Admins can update product characteristic icons"
  ON public.product_characteristic_icons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete product characteristic icons"
  ON public.product_characteristic_icons;
CREATE POLICY "Admins can delete product characteristic icons"
  ON public.product_characteristic_icons
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
