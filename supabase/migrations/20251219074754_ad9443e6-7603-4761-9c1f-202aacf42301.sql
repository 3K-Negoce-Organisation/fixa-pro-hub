-- Table pour les paramètres fournisseur (singleton)
CREATE TABLE public.supplier_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  status_email TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS : Seuls les admins peuvent lire/modifier
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage supplier settings"
  ON public.supplier_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger pour updated_at
CREATE TRIGGER supplier_settings_updated_at
  BEFORE UPDATE ON public.supplier_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Insérer une ligne par défaut (singleton)
INSERT INTO public.supplier_settings (name, email) VALUES ('', '');