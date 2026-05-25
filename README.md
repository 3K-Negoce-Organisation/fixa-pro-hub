## Welcome

**Assistants / déploiement 3K :** lire **[`AI-WORKSPACE-CONTEXT.md`](AI-WORKSPACE-CONTEXT.md)** (source de vérité — Supabase, Railway, PDF fournisseur, simulation admin, kits `KIT*`). Admin : **[`../admin-hub-central/AI-WORKSPACE-CONTEXT.md`](../admin-hub-central/AI-WORKSPACE-CONTEXT.md)**.

### Stripe (paiement vitrine)

- **Mode live / test** : colonne `sites.stripe_mode` (`live` | `test`), modifiable depuis **Admin Hub Central → Paramètres du site**.
- **Railway (fixa-pro-hub)** : `VITE_STRIPE_PUBLISHABLE_KEY_LIVE`, `VITE_STRIPE_PUBLISHABLE_KEY_TEST` (repli : `VITE_STRIPE_PUBLISHABLE_KEY`).
- **Supabase (Edge Functions)** : `STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST` (repli : `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`).

Documentation détaillée : [`docs/STRIPE_SITE_PROMPT.md`](docs/STRIPE_SITE_PROMPT.md).

## Project info

to be completed
