# Configuration SEO — actions manuelles (prod)

Domaine canonique : **https://www.vis-a-bois.com**

## Meta par page (canonical / title)

Au **build**, `scripts/generate-seo-manifest.mjs` produit `public/seo-manifest.json` (une entrée par URL publique : accueil, catégories, fiches produit, pages légales).

Au **runtime**, `scripts/storefront-server.mjs` injecte dans `index.html` le `<title>`, la `<link rel="canonical">`, la description et les balises Open Graph **avant** le chargement React — c’est ce que Google Search Console lit en priorité sur une SPA.

Côté client, `PageSeo` + `HelmetProvider prioritizeSeoTags` mettent à jour les meta après navigation.

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
| `http://vis-a-bois.com` | `https://www.vis-a-bois.com` |
| `http://vis-a-bois.fr` | `https://www.vis-a-bois.com` |

Le serveur Node (`scripts/storefront-server.mjs`) renvoie aussi une **301** pour ces hôtes si le trafic atteint Railway (complément des domaines custom Railway).

### DNS OVH — apex `vis-a-bois.com` (2026-06-29)

Domaine ajouté sur Railway (`vis-a-bois-production`). Enregistrement requis chez OVH :

| Type | Nom | Cible |
|------|-----|--------|
| CNAME | `@` (ou vide) | `76hqqw6n.up.railway.app` |

Si OVH refuse le CNAME sur la racine, utiliser l’**ALIAS** / redirection apex proposée par OVH vers `76hqqw6n.up.railway.app`, ou un enregistrement **A** vers l’IP indiquée par Railway dans le dashboard **Domains**.

Après propagation DNS + certificat TLS, `http://vis-a-bois.com/robots.txt` répondra (301 → `https://www.vis-a-bois.com/robots.txt`).

Voir `deploy/nginx-seo-redirects.conf` pour un exemple nginx.

## 4. Variables Railway / Supabase

| Variable | Valeur recommandée |
|----------|-------------------|
| `STOREFRONT_URL` | `https://www.vis-a-bois.com` |
| `VITE_GOOGLE_SITE_VERIFICATION` | Code GSC (optionnel) |
| `VITE_GA_MEASUREMENT_ID` | `G-HZ8ME0W15M` (GA4 Vis-à-Bois) |

## 4b. Google Analytics 4

1. Créer la propriété GA4 et le flux web `https://www.vis-a-bois.com`
2. Définir `VITE_GA_MEASUREMENT_ID=G-HZ8ME0W15M` sur Railway (prod + staging si besoin) puis **rebuild**
3. Le site charge `gtag.js` avec **Consent Mode** (analytics/ads denied par défaut)
4. La bannière cookies (`CookieConsent`) met à jour le consentement (Tout accepter / Personnaliser)
5. Dans GA4 : **Admin** → **Liaison des produits** → **Search Console** → lier `https://www.vis-a-bois.com`
6. Bouton **Test installation** dans l’écran Google tag, ou temps réel GA4 après acceptation cookies

## 5. Contenu métier (sans code)

- Compléter les descriptions des **20 best-sellers** sans `description` en base (admin produits)
- Vérifier les 4 PDF sur `/information-technique` en prod

## 6. Visibilité IA (GEO) — additif, sans changer le parcours boutique

### Technique déjà en place

- JSON-LD `Organization` + `WebSite` (accueil) et `FAQPage` (FAQ) : client (`PageSeo`) **et** HTML initial via `seo-manifest` + `storefront-server`
- Blocs `<noscript id="geo-crawl-content">` sur pages clés (accueil, FAQ, guide, comparatif, à propos) — visibles uniquement sans JS, **sans** dupliquer le rendu React
- Pages éditoriales : `/guide-choix-vis-a-bois`, `/comparatif-vis-inox-a2-a4`, `/a-propos`
- `public/llms.txt` (manifeste pour agents ; **pas** un signal de ranking Google)
- `robots.txt` : Allow explicite GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended (même politique qu’avant : crawl search autorisé)

### Mesure citation (hebdo)

Tester un set fixe de prompts FR sur ChatGPT (web), Perplexity et Google AI Overviews. Noter : cité / non cité / URL concurrente.

Exemples de prompts :

1. meilleures vis à bois en ligne France
2. où acheter des vis à bois terrasse inox
3. différence vis inox A2 et A4
4. quelle vis choisir pour terrasse bois
5. vis à bois charpente professionnelle
6. Vis-à-Bois avis / qui est Vis-à-Bois
7. fournisseur vis à bois livraison rapide
8. vis tirefond tête hexagonale
9. fiche technique vis terrasse Torx
10. frais de livraison vis à bois
11. inox A4 bord de mer terrasse
12. catalogue vis à bois diamètre longueur
13. 3K-Négoce Vis-à-Bois
14. comment choisir longueur vis à bois
15. vis agglo vs vis charpente
16. acheter vis à bois par boîte
17. retour commande vis à bois
18. vis VBF galvanisée
19. comparatif acier zingué vs inox vis bois
20. spécialiste vis à bois particuliers France

Après déploiement : soumettre à nouveau le sitemap GSC (nouvelles URLs guide / comparatif / à propos).

## 7. Suivi (J+30 / J+90)

Dans Search Console : pages indexées, impressions « vis à bois », erreurs canonical. Côté IA : part de citation sur le set de 20 prompts.
