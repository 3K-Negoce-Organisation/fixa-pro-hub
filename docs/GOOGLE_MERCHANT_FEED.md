# Google Merchant Center — fichier produits (feed TSV)

Guide Google : [Create a product file for Merchant Center](https://support.google.com/merchants/answer/12631822)

Spécification attributs : [Product data specification](https://support.google.com/merchants/answer/7052112)

## Fichier généré

| Élément | Valeur |
|---------|--------|
| Format | TSV (tabulation), UTF-8 |
| Site (compte Merchant Center) | `https://www.3k-negoce.com` |
| Langue / pays cible | `fr` / `FR` |
| Catégorie Google | `1732` (Hardware > Hardware Accessories > Fasteners) |
| Marque (fabricant / GTIN) | `Alsafix` |
| Politique retours (site) | `https://www.3k-negoce.com/retours` |

### Colonnes exportées

`id`, `title`, `description`, `link`, `image_link`, `additional_image_link`, `availability`, `price`, `sale_price`, `brand`, `gtin`, `mpn`, `condition`, `google_product_category`, `product_type`, `identifier_exists`, `shipping`

- **id** : `code_alsafix` ou UUID produit
- **price** : TTC (`price_ttc`) en EUR
- **sale_price** : prix promo TTC si `is_promo`
- **gtin** : colonne `ean` (si valide 8/12/13/14 chiffres)
- **mpn** : `code_alsafix`
- Produits sans image ou sans description sont exclus du feed

## Option A — URL dynamique (recommandé)

Edge Function Supabase `google-merchant-feed` sert le TSV à jour (cache 1 h).

**Production (recommandé — domaine 3K-Négoce) :**
```
https://www.3k-negoce.com/google-merchant-feed.tsv
```

**Secours Edge Function :**
```
https://lqsbsinycyewdvdtbruy.supabase.co/functions/v1/google-merchant-feed
```

**Staging :**
```
https://lhrwjnieojuempxjbgql.supabase.co/functions/v1/google-merchant-feed
```

### Déploiement

```bash
cd fixa-pro-hub
source ../scripts/load-3k-env.sh
supabase functions deploy google-merchant-feed --project-ref lqsbsinycyewdvdtbruy --no-verify-jwt
```

### Merchant Center

1. [Merchant Center](https://merchants.google.com/) → **Products** → **Add product source**
2. Type : **Scheduled fetch** (URL)
3. URL : `https://www.3k-negoce.com/google-merchant-feed.tsv`
4. Fréquence : **Daily** (24 h)
5. File name / format : `.tsv`, encodage UTF-8
6. Pays de vente : **France**
7. Langue : **French**

Configurer aussi **Shipping and returns** avec la politique du site (`/retours`, 14 jours) — doit correspondre à la page web.

## Option B — Fichier statique local

```bash
cd fixa-pro-hub
source ../scripts/load-3k-env.sh
node scripts/generate-google-merchant-feed.mjs --env production --out public/google-merchant-feed.tsv
```

Upload manuel dans Merchant Center (**Upload a file**) ou hébergement sur `https://www.3k-negoce.com/google-merchant-feed.tsv`.

## Vérification

```bash
# Nombre de lignes (header + produits)
wc -l public/google-merchant-feed.tsv

# Aperçu
head -3 public/google-merchant-feed.tsv
```

Dans Merchant Center, onglet **Diagnostics** : corriger les produits refusés (EAN manquant, image, prix incohérent avec le site).

## Cohérence site ↔ feed

Le feed doit refléter le site public (sans connexion) :

- URL produit : `https://www.3k-negoce.com/produit/{handle}`
- Prix affiché = `price` / `sale_price` du feed
- Stock : `in_stock` si `stock > 0`
- Retours : page `/retours` accessible depuis le footer

## Fichiers code

| Fichier | Rôle |
|---------|------|
| `supabase/functions/_shared/google-merchant-feed.ts` | Builder TSV partagé |
| `supabase/functions/google-merchant-feed/index.ts` | Edge Function HTTP |
| `scripts/generate-google-merchant-feed.mjs` | Export local / CI |
