# Prompt — vitrine (fixa-pro-hub) et mode Stripe TEST / LIVE

## Contexte déjà implémenté (à ne pas refaire)

- Colonne base **`public.sites.stripe_mode`** : `'live'` ou `'test'` (défaut `'live'`). Migration `20260513120000_sites_stripe_mode.sql`.
- **Admin Hub Central** : page *Paramètres du site* — switch « Stripe production » avec **double confirmation** ; badge **STRIPE LIVE / STRIPE TEST** sous le titre, à côté du badge d’environnement.
- **Edge Functions** (`fixa-pro-hub/supabase/functions/`) :
  - `create-payment-intent` et `create-stripe-checkout` lisent `sites.stripe_mode` et choisissent **`STRIPE_SECRET_KEY_LIVE`** ou **`STRIPE_SECRET_KEY_TEST`** (repli sur `STRIPE_SECRET_KEY`).
  - `stripe-webhook` vérifie la signature avec **`STRIPE_WEBHOOK_SECRET_LIVE`**, puis l’ancien **`STRIPE_WEBHOOK_SECRET`**, puis **`STRIPE_WEBHOOK_SECRET_TEST`** ; les appels API Stripe suivants utilisent la clé secrète correspondant à **`event.livemode`**.
- **Vitrine** : `StripePaymentForm.tsx` lit `sites.stripe_mode` via `SITE_SLUG`, charge **`VITE_STRIPE_PUBLISHABLE_KEY_LIVE`** ou **`VITE_STRIPE_PUBLISHABLE_KEY_TEST`** (repli sur `VITE_STRIPE_PUBLISHABLE_KEY`), et affiche un **bandeau ambre** « Environnement Stripe TEST » au-dessus du formulaire de paiement intégré lorsque `stripe_mode === 'test'`.

## Tâches possibles pour la suite (si besoin)

1. **Autres écrans** : si un jour le paiement Stripe apparaît ailleurs qu’ dans `StripePaymentForm`, réutiliser la même logique (lecture `stripe_mode` + clé publique + bannière test).
2. **Temps réel** : optionnel — écouter les changements `sites` (Supabase Realtime) pour mettre à jour le bandeau sans recharger la page panier.
3. **Multi-boutiques** : si plusieurs lignes `sites` sont servies par une même instance front, vérifier que `SITE_SLUG` / `STOREFRONT_SITE_SLUG` pointent toujours vers le bon site.

## Variables à configurer

### Railway (build vitrine fixa-pro-hub)

- `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` — clé publique **pk_live_…**
- `VITE_STRIPE_PUBLISHABLE_KEY_TEST` — clé publique **pk_test_…**
- (rétrocompat) `VITE_STRIPE_PUBLISHABLE_KEY` — utilisée comme repli si les variables ci-dessus manquent

### Supabase (secrets Edge Functions)

- `STRIPE_SECRET_KEY_LIVE` — **sk_live_…**
- `STRIPE_SECRET_KEY_TEST` — **sk_test_…**
- `STRIPE_WEBHOOK_SECRET_LIVE` — secret du endpoint webhook **live**
- `STRIPE_WEBHOOK_SECRET_TEST` — secret du endpoint webhook **test**
- (rétrocompat) `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

Redéployer les fonctions **`create-payment-intent`**, **`create-stripe-checkout`**, **`stripe-webhook`** après modification des secrets.
