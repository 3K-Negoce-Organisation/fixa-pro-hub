-- Blog éditorial multi-site (vis-a-bois, etc.)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  slug text NOT NULL,
  title text NOT NULL,
  excerpt text,
  content text NOT NULL DEFAULT '',
  cover_image_url text,
  author_name text NOT NULL DEFAULT 'Vis-à-Bois',
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blog_posts_site_slug_unique UNIQUE (site_id, slug)
);

CREATE INDEX IF NOT EXISTS blog_posts_site_published_idx
  ON public.blog_posts (site_id, is_published, published_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS blog_posts_site_sort_idx
  ON public.blog_posts (site_id, sort_order, published_at DESC NULLS LAST);

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    is_published = true
    AND (published_at IS NULL OR published_at <= now())
  );

DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;
CREATE POLICY "Admins can manage blog posts"
  ON public.blog_posts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO authenticated;

-- Images de couverture
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Blog images are publicly accessible" ON storage.objects;
CREATE POLICY "Blog images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

DROP POLICY IF EXISTS "Admins can upload blog images" ON storage.objects;
CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update blog images" ON storage.objects;
CREATE POLICY "Admins can update blog images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-images'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can delete blog images" ON storage.objects;
CREATE POLICY "Admins can delete blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images'
    AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Articles de démarrage pour le site vis-a-bois
INSERT INTO public.blog_posts (
  site_id, slug, title, excerpt, content, author_name, is_published, published_at, sort_order
)
SELECT
  s.id,
  v.slug,
  v.title,
  v.excerpt,
  v.content,
  'Vis-à-Bois',
  true,
  now() - (v.days_ago || ' days')::interval,
  v.sort_order
FROM public.sites s
CROSS JOIN (
  VALUES
    (
      'choisir-vis-terrasse',
      'Comment choisir ses vis de terrasse ?',
      'Inox A2 ou A4, diamètre, longueur : les critères essentiels pour une terrasse durable.',
      E'## Pourquoi le choix de la vis compte\n\nUne terrasse bien fixée commence par le bon choix de vis. L''environnement extérieur impose une résistance à la corrosion et une tenue mécanique adaptée au bois.\n\n## Inox A2 ou A4 ?\n\n- **Inox A2** : idéal pour une terrasse en zone continentale, loin du bord de mer.\n- **Inox A4** : recommandé en environnement agressif (bord de mer, piscine, humidité permanente).\n\n## Diamètre et longueur\n\nEn règle générale, la longueur de la vis doit être au moins **2,5 fois** l''épaisseur de la lame. Pour des lames de 21 mm, une vis 5×50 ou 5×60 est souvent adaptée.\n\n## Empreinte et pose\n\nPréférez une empreinte **TX** (Torx) pour un meilleur couple et moins de risques de cam-out. Pré-percez les bois durs si nécessaire.\n\nRetrouvez notre sélection [Vis terrasse](/produits?category=vis-terrasse) sur le catalogue.',
      2,
      0
    ),
    (
      'tirefond-ou-vis-charpente',
      'Tirefond ou vis de charpente : que choisir ?',
      'Deux familles de fixations pour la structure bois — usages, charges et bonnes pratiques.',
      E'## Deux usages distincts\n\nLe **tirefond** et la **vis de charpente** servent tous deux la structure bois, mais pas dans les mêmes conditions.\n\n## Le tirefond\n\nLe tirefond (ou tire-fond) est une grosse vis à tête hexagonale, souvent utilisée pour :\n\n- assembler des pièces massives ;\n- fixer des sabots, ferrures ou platines ;\n- les assemblages où un couple élevé est nécessaire.\n\n## La vis de charpente\n\nLa vis de charpente, plus fine et souvent à tête fraisée ou bombée, convient pour :\n\n- les assemblages bois/bois de charpente légère ;\n- les fixations rapides sans pré-perçage sur bois tendre ;\n- les finitions plus discrètes.\n\n## Conseil Vis-à-Bois\n\nPour les charges importantes ou les ferrures métalliques, privilégiez le tirefond. Pour l''assemblage courant de pièces de structure, la vis de charpente reste le choix le plus polyvalent.\n\nParcourez nos gammes [Tirefond](/produits?category=tirefond) et [Vis de charpente](/produits?category=vis-de-charpente).',
      8,
      1
    ),
    (
      'guide-empreintes-torx',
      'Guide des empreintes Torx pour vis à bois',
      'TX10, TX15, TX20, TX25 : quelle empreinte pour quel diamètre, et pourquoi les embouts comptent.',
      E'## L''empreinte Torx, standard pro\n\nL''empreinte **Torx (TX)** s''est imposée chez les professionnels grâce à un meilleur transfert de couple et une usure réduite de l''outil.\n\n## Correspondances courantes\n\n| Empreinte | Diamètres fréquents |\n|-----------|---------------------|\n| TX10 | 3 à 3,5 mm |\n| TX15 | 3,5 à 4 mm |\n| TX20 | 4 à 5 mm |\n| TX25 | 5 à 6 mm |\n\n## Embouts et coffrets\n\nUn embout usé endommage la tête de vis. Gardez un stock d''embouts adaptés (TX10 à TX25) et un coffret de rechange pour le chantier.\n\nDécouvrez nos embouts et accessoires dans le catalogue, section commandes rapides sur la page d''accueil.',
      14,
      2
    )
) AS v(slug, title, excerpt, content, days_ago, sort_order)
WHERE s.slug = 'vis-a-bois'
ON CONFLICT (site_id, slug) DO NOTHING;
