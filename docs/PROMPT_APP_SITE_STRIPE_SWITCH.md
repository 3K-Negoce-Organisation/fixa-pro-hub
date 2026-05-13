# Prompt — App vitrine (site) : prise en charge du switch Stripe live / test

Copie le bloc ci-dessous dans une nouvelle conversation Cursor (ou ticket) pour l’app **front boutique** qui consomme Supabase et Stripe.

---

## Contexte produit

Le mode Stripe (**production vs test**) est piloté **par site** en base PostgreSQL :

- Table **`public.sites`**, colonne **`stripe_mode`** : valeur **`live`** ou **`test`** (défaut `live`).
- L’**admin** (Admin Hub Central) permet de basculer ce champ avec double confirmation ; la vitrine et les Edge Functions Supabase doivent **respecter** cette valeur.

Les **secrets** Stripe (`sk_live`, `sk_test`, `whsec_…`) restent **uniquement** côté **Supabase Edge Functions** et secrets projet — **jamais** dans le build Vite.

## Variables d’environnement (Railway / build front)

Le front doit exposer **deux** clés publiques (repli possible sur une seule variable historique) :

| Variable | Usage |
|----------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY_LIVE` | `pk_live…` quand `stripe_mode === 'live'` |
| `VITE_STRIPE_PUBLISHABLE_KEY_TEST` | `pk_test…` quand `stripe_mode === 'test'` |
| `VITE_STRIPE_PUBLISHABLE_KEY` (optionnel) | Repli si l’une des deux ci-dessus manque |

## Comportement attendu côté site

1. **Lecture du mode**  
   Au chargement du parcours paiement (ou au montage d’un layout checkout), faire une requête Supabase **lecture seule** sur la ligne `sites` du site courant (ex. filtre par `slug` aligné sur `SITE_SLUG` / config), champ **`stripe_mode`**.

2. **Choix de la clé publique Stripe.js**  
   - `stripe_mode === 'test'` → `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)`  
   - sinon → `loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE || import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)`  
   Mettre en cache la `Promise` Stripe **par clé** (si l’utilisateur change de mode sans recharger, prévoir un remount ou invalidation du cache).

3. **Appels Edge Functions**  
   Ne pas passer le mode Stripe dans le body pour faire confiance au client : **`create-payment-intent`** et **`create-stripe-checkout`** lisent déjà `sites.stripe_mode` côté serveur avec la **service role**. Le front envoie seulement panier / email invité comme aujourd’hui.

4. **UX mode test**  
   Lorsque `stripe_mode === 'test'`, afficher un **bandeau visible** (couleur d’avertissement) sur **chaque écran** qui affiche Stripe (Payment Element, bouton redirection Checkout, etc.) :  
   *« Environnement Stripe TEST — aucun prélèvement réel ; utiliser uniquement des cartes de test. »*

5. **Cohérence**  
   Si le mode change pendant qu’un utilisateur a déjà un `clientSecret` ou une session ouverte, prévoir **invalidation** : reset secret / re-fetch ou message « Actualisez la page ».

6. **Tests**  
   - Avec `stripe_mode = test` : paiement avec carte test Stripe, pas de charge live.  
   - Avec `stripe_mode = live` : pas de bandeau test, clés `pk_live` chargées.

## Références code (fixa-pro-hub — déjà implémenté en partie)

- `src/components/checkout/StripePaymentForm.tsx` : lecture `sites.stripe_mode`, clés `VITE_STRIPE_*`, bandeau test, `Elements` avec la bonne `Promise` Stripe.
- `src/lib/siteSlug.ts` (ou équivalent) : slug du site pour la requête `sites`.

## Hors périmètre front (ne pas dupliquer ici)

- Création des webhooks Stripe test/live et secrets `STRIPE_WEBHOOK_SECRET_*` dans Supabase.  
- Déploiement des Edge Functions.  
- Modification du switch dans l’admin (déjà dans Admin Hub Central).

## Livrables demandés à l’agent

- Liste des **fichiers** touchés (nouveau hook `useSiteStripeMode` ou équivalent si pertinent).  
- Vérification qu’**aucun** secret `sk_` / `whsec_` n’apparaît dans le bundle client.  
- Capture ou description du **bandeau** mode test sur le(s) formulaire(s) Stripe.

---

Fin du prompt.
