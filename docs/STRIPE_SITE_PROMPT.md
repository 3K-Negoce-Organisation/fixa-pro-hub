# Vitrine fixa-pro-hub — mode Stripe TEST / LIVE (`sites.stripe_mode`)

Documentation de référence pour l’alignement vitrine ↔ admin ↔ Edge Functions. Pour un **prompt** réutilisable dans une conversation, voir aussi [`PROMPT_APP_SITE_STRIPE_SWITCH.md`](./PROMPT_APP_SITE_STRIPE_SWITCH.md).

---

## Contexte produit (contrat)

- Table **`public.sites`**, colonne **`stripe_mode`** : **`live`** ou **`test`** (défaut `live`). Migration `supabase/migrations/20260513120000_sites_stripe_mode.sql`.
- **Admin Hub Central** : *Paramètres du site* — interrupteur « Stripe production (live) », double confirmation, persistance `sites.stripe_mode`, `SiteContext` / badge **STRIPE LIVE** ou **STRIPE TEST** (hors périmètre de ce dépôt).
- **Edge Functions** (`fixa-pro-hub/supabase/functions/`) — **source de vérité** pour les secrets :
  - `create-payment-intent` et `create-stripe-checkout` lisent `sites.stripe_mode` (service role) et choisissent **`STRIPE_SECRET_KEY_LIVE`** ou **`STRIPE_SECRET_KEY_TEST`** (repli sur `STRIPE_SECRET_KEY`).
  - `stripe-webhook` : secrets webhook **`STRIPE_WEBHOOK_SECRET_*`** selon la doc du projet (repli sur `STRIPE_WEBHOOK_SECRET`).
- **Vitrine** : ne **passe pas** le mode Stripe dans le body des invocations Edge ; le serveur reste autoritaire. Le front ne sert qu’au choix de la **clé publique** Stripe.js et à l’**UX** (bandeau test).

---

## Implémentation vitrine (état livré)

### Fichiers

| Fichier | Rôle |
|---------|------|
| `src/lib/siteSlug.ts` | **`SITE_SLUG`** = `import.meta.env.VITE_SITE_SLUG?.trim()` ou défaut **`vis-a-bois`** — aligné avec le secret Edge optionnel **`STOREFRONT_SITE_SLUG`**. |
| `src/lib/stripePublishableKey.ts` | Résolution des clés publiques : **test** → `VITE_STRIPE_PUBLISHABLE_KEY_TEST` puis `VITE_STRIPE_PUBLISHABLE_KEY` ; **live** → `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` puis `VITE_STRIPE_PUBLISHABLE_KEY`. En **développement local uniquement** (`VITE_SITE_ENVIRONMENT_NAME` absent ou `DEVELOP`), repli possible sur la clé générique si la variable spécifique manque. **Aucune** clé `pk_*` codée en dur dans le bundle pour staging/production. Cache **`loadStripe` par clé** (`Map`) ; **`clearStripePromiseCache()`** pour invalider après changement de mode. |
| `src/hooks/useSiteStripeMode.ts` | Requête **lecture seule** `sites.stripe_mode` pour `SITE_SLUG` et `is_active = true`. Rechargement au **retour sur l’onglet** (`visibilitychange`). |
| `src/components/checkout/StripeTestModeBanner.tsx` | Bandeau ambre : environnement **TEST**, aucun prélèvement réel, cartes de test uniquement. |
| `src/components/checkout/StripePaymentForm.tsx` | Parcours paiement : hook + résolution de clé ; bandeau sur **tous** les états post–porte invité (config Stripe, chargement Stripe.js, préparation PaymentIntent, fallback Checkout hébergé, `Elements`). Si **`stripe_mode` change** en session : invalidation cache Stripe.js, reset `clientSecret` / promesse, incrément **`paymentEpoch`** pour recréer le PI, **`key`** sur `Elements` pour remonter le module. |

### Points d’entrée Stripe

- Aujourd’hui : **`CartPage.tsx`** → **`StripePaymentForm.tsx`** (Payment Element + redirection `create-stripe-checkout`).
- Pour tout nouvel écran Stripe : réutiliser **`useSiteStripeMode`** + **`resolvePublishableKey`** / **`getStripePromiseForPublishableKey`** + **`StripeTestModeBanner`**.

### Payload Edge (inchangé)

- **`create-payment-intent`** : `{ items, guestEmail? }` (selon auth).
- **`create-stripe-checkout`** : `{ items, guestEmail? }`.
- **Aucun** champ « mode Stripe » côté client pour faire foi.

---

## Comportement attendu (tests manuels)

| Cas | Attendu |
|-----|---------|
| `stripe_mode = test` | Bandeau TEST sur tout le flux paiement après l’étape email invité ; Stripe.js avec clé **test** ; paiement avec cartes de test. |
| `stripe_mode = live` | Pas de bandeau ; Stripe.js avec clé **live**. |
| Bascule admin **pendant** une session panier | Au retour sur l’onglet (`visibilitychange`), relecture du mode ; si le mode change : réinitialisation du flux (nouveau PI, remount `Elements`). |

---

## Sécurité / build

- **Interdit** dans le code source vitrine : clés publiques Stripe **codées en dur** pour les builds **staging** et **production** (`VITE_SITE_ENVIRONMENT_NAME` = `STAGING` ou `PRODUCTION`) — les clés viennent uniquement des variables `VITE_*`.
- Vérification : aucune occurrence de **`sk_`** ni **`whsec_`** sous `src/` (secrets réservés aux Edge Functions).
- En staging/production, si la clé attendue pour le mode courant est **absente**, message d’erreur explicite côté UI (pas de repli silencieux vers une autre clé live/test).

---

## Variables d’environnement

### Railway / build Vite (vitrine)

| Variable | Usage |
|----------|--------|
| `VITE_SITE_SLUG` | (Optionnel) Slug `public.sites.slug` ; défaut **`vis-a-bois`**. |
| `VITE_SITE_ENVIRONMENT_NAME` | `PRODUCTION` \| `STAGING` \| `DEVELOP` — contrôle les garde-fous clés publiques (voir `src/lib/environment.ts`). |
| `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` | `pk_live…` quand `stripe_mode === 'live'`. |
| `VITE_STRIPE_PUBLISHABLE_KEY_TEST` | `pk_test…` quand `stripe_mode === 'test'`. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | (Optionnel) Repli si l’une des deux ci-dessus manque. |

### Supabase (secrets Edge Functions)

- `STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST` (repli `STRIPE_SECRET_KEY`).
- `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST` (repli `STRIPE_WEBHOOK_SECRET` selon implémentation webhook).
- `STOREFRONT_SITE_SLUG` (optionnel, défaut aligné sur la vitrine).

Redéployer **`create-payment-intent`**, **`create-stripe-checkout`**, **`stripe-webhook`** après modification des secrets.

---

## Pistes d’évolution (non requises)

1. **Realtime** : écouter les mises à jour `sites` (Supabase Realtime) pour rafraîchir le mode sans `visibilitychange`.
2. **Multi-boutiques** : vérifier que chaque déploiement a le bon `VITE_SITE_SLUG` / `STOREFRONT_SITE_SLUG`.

---

## Git (référence)

Les changements vitrine décrits ci-dessus sont intégrés dans l’historique Git du dépôt **fixa-pro-hub** (branches `staging` / `main`) sous des commits du type `feat(stripe): mode live/test depuis sites + clés publiques VITE_*`. Pour le hash exact au moment d’une release, voir `git log` sur la branche déployée.
