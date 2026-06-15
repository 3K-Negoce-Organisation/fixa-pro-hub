# Configuration SEO — actions manuelles (prod)

Domaine canonique : **https://www.vis-a-bois.com**

## 1. Google Search Console

1. Créer un compte sur [Google Search Console](https://search.google.com/search-console)
2. Ajouter la propriété `https://www.vis-a-bois.com`
3. Valider via DNS (recommandé) ou balise meta :
   - Définir `VITE_GOOGLE_SITE_VERIFICATION` dans Railway avec le code fourni par Google
   - Rebuild et redéployer le storefront
4. Après les redirections 301, ajouter aussi `vis-a-bois.fr` pour surveiller la migration
5. Soumettre le sitemap : `https://www.vis-a-bois.com/sitemap.xml`

## 2. Boutique publique (indexation Google)

En **production** Supabase :

- Admin → **Paramètres fournisseur** → activer **« Boutique en ligne »** (`storefront_public = true`)

Test en navigation privée : `https://www.vis-a-bois.com/produits` **sans être connecté**.

- Si redirection vers `/auth` → Google ne verra pas le catalogue.

## 3. Redirections 301 (.fr et sans-www)

Configurer au niveau **Railway** (domaines personnalisés) ou **OVH** (DNS / hébergement) :

| Source | Destination |
|--------|-------------|
| `https://vis-a-bois.fr` | `https://www.vis-a-bois.com` |
| `https://www.vis-a-bois.fr` | `https://www.vis-a-bois.com` |
| `https://vis-a-bois.com` | `https://www.vis-a-bois.com` |

Voir `deploy/nginx-seo-redirects.conf` pour un exemple nginx.

## 4. Variables Railway / Supabase

| Variable | Valeur recommandée |
|----------|-------------------|
| `STOREFRONT_URL` | `https://www.vis-a-bois.com` |
| `VITE_GOOGLE_SITE_VERIFICATION` | Code GSC (optionnel) |

## 5. Contenu métier (sans code)

- Compléter les descriptions des **20 best-sellers** sans `description` en base (admin produits)
- Vérifier les 4 PDF sur `/information-technique` en prod

## 6. Suivi (J+30 / J+90)

Dans Search Console : pages indexées, impressions « vis à bois », erreurs canonical.
